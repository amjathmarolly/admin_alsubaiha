const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const uploadDir = path.join(process.cwd(), 'public/uploads');
const dryRun = process.argv.includes('--dry-run');

function normalizeName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function stripSuffix(baseName) {
    const withoutExt = path.basename(baseName, path.extname(baseName));
    return withoutExt.replace(/-\d{13,}-\d{1,}$/g, '').replace(/-\d{1,}$/g, '').trim();
}

function getSimilarityScore(targetName, candidateName) {
    const a = normalizeName(stripSuffix(targetName));
    const b = normalizeName(stripSuffix(candidateName));
    if (!a || !b) return 0;

    if (a === b) return 1000;

    const aWords = new Set(a.split(' ').filter(Boolean));
    const bWords = new Set(b.split(' ').filter(Boolean));
    const overlap = [...aWords].filter((word) => bWords.has(word)).length;
    const tokenScore = overlap * 20;

    const hasPrefix = a.includes(b) || b.includes(a);
    const score = tokenScore + (hasPrefix ? 25 : 0);
    return score;
}

function listFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...listFiles(full));
        } else {
            files.push(full);
        }
    }

    return files;
}

function extractDbTargets(row) {
    const targets = new Set();
    if (row.image && String(row.image).startsWith('/uploads/')) {
        targets.add(path.basename(row.image));
    }
    if (row.images) {
        try {
            const parsed = JSON.parse(row.images);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    if (typeof item === 'string' && item.startsWith('/uploads/')) {
                        targets.add(path.basename(item));
                    }
                }
            }
        } catch (err) {
            // Ignore malformed JSON values.
        }
    }
    return [...targets];
}

async function main() {
    if (!fs.existsSync(uploadDir)) {
        console.error('Upload directory not found:', uploadDir);
        process.exit(1);
    }

    const files = listFiles(uploadDir);
    const fileNames = files.map((file) => path.basename(file));
    const renames = [];

    const cfg = {
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    };

    const conn = await mysql.createConnection(cfg);
    const [rows] = await conn.execute('SELECT id, name, image, images FROM products WHERE image LIKE "/uploads/%" OR images LIKE "%/uploads/%" ORDER BY name');

    for (const row of rows) {
        const targets = extractDbTargets(row);
        for (const targetName of targets) {
            const targetPath = path.join(uploadDir, targetName);
            if (fs.existsSync(targetPath)) {
                continue;
            }

            let match = null;
            for (const file of files) {
                const currentName = path.basename(file);
                if (currentName === targetName) {
                    match = file;
                    break;
                }

                const score = getSimilarityScore(targetName, currentName);
                if (!match || score > match.score) {
                    match = { file, score };
                }
            }

            if (!match || match.score < 20) {
                continue;
            }

            const sourceFile = match.file;
            const sourceName = path.basename(sourceFile);
            if (sourceName === targetName) continue;

            renames.push({
                from: sourceFile,
                to: targetPath,
                sourceName,
                targetName,
                product: row.name,
            });
        }
    }

    await conn.end();

    if (dryRun) {
        console.log(JSON.stringify({ totalPlannedRenames: renames.length, renames }, null, 2));
        return;
    }

    for (const rename of renames) {
        if (fs.existsSync(rename.to)) {
            continue;
        }

        fs.renameSync(rename.from, rename.to);
        console.log(`RENAMED ${rename.sourceName} -> ${rename.targetName} (${rename.product})`);
    }

    console.log(`Completed renames. Total processed: ${renames.length}`);
}

main().catch((error) => {
    console.error('Failed to sync upload filenames with database:', error);
    process.exit(1);
});
