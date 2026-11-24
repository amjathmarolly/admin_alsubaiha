import { NextResponse } from "next/server";
import { query } from "@/lib/db/config";
import { withCors } from "@/lib/cors";

async function setupHandler() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS designers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image VARCHAR(500) NOT NULL,
        short_bio TEXT NOT NULL,
        inspiration_text TEXT NOT NULL,
        design_principles JSON NOT NULL,
        notable_works JSON NOT NULL,
        website VARCHAR(500),
        social_links JSON,
        status ENUM('active', 'inactive') DEFAULT 'active',
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_sort (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    // 1. Create table
    await query(createTableQuery);

    // 2. Check if table is empty
    const checkEmpty = await query<any[]>("SELECT COUNT(*) as count FROM designers");
    const count = checkEmpty[0]?.count || 0;

    if (count === 0) {
      // 3. Seed default designers
      const defaultDesigners = [
        {
          id: "charlotte-perriand",
          name: "Charlotte Perriand",
          image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80",
          short_bio: "Charlotte Perriand was a French architect and designer who sought to create functional spaces and furniture that improved the lives of everyday citizens. Her work combined natural materials like wood and cane with steel and aluminum, bridging the gap between artisan craft and industrial production.",
          inspiration_text: "Perriand's philosophy that design should be human-centric and accessible inspires our commitment to modular comfort and functional elegance. Her mastery of combining warm natural wood textures with sleek structural elements is a direct blueprint for our furniture collections.",
          design_principles: JSON.stringify([
            "Human-Centric Functionalism",
            "Organic Material Blends (Teak, Straw, Leather)",
            "Modular & Space-Optimizing Structures",
            "Rationalist Minimalism"
          ]),
          notable_works: JSON.stringify([
            "LC4 Chaise Longue (with Le Corbusier)",
            "Les Arcs Ski Resort Interior",
            "Bibliothèque Maison du Mexique",
            "Nuage Shelving System"
          ]),
          website: "https://www.charlotteperriand.com",
          social_links: JSON.stringify({
            instagram: "https://instagram.com/charlotte_perriand"
          }),
          sort_order: 1
        },
        {
          id: "jean-prouve",
          name: "Jean Prouvé",
          image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80",
          short_bio: "Jean Prouvé was a French metalworker, self-taught architect, and designer. He is widely recognized for his structural honesty, utilizing folded sheet metal to create highly durable, visually lightweight furniture and prefabricated architectural systems.",
          inspiration_text: "Prouvé's insistence on constructional purity and structural truth inspires our approach to joinery and framing. He proved that structural elements do not need to be hidden; when designed with care, the support system itself becomes the most beautiful ornament.",
          design_principles: JSON.stringify([
            "Structural Honesty & Integrity",
            "Folded Sheet Metal Engineering",
            "Durable, Low-Waste Craftsmanship",
            "Tectonic Aestheticism"
          ]),
          notable_works: JSON.stringify([
            "Standard Chair (Chaise Tout Bois)",
            "EM Table",
            "Compas Direction Desk",
            "Maison Démontable"
          ]),
          website: "https://www.jeanprouve.com",
          social_links: JSON.stringify({}),
          sort_order: 2
        },
        {
          id: "pierre-jeanneret",
          name: "Pierre Jeanneret",
          image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80",
          short_bio: "Pierre Jeanneret was a Swiss architect and furniture designer who worked closely with his cousin Le Corbusier. He is best known for his monumental work in Chandigarh, India, where he designed furniture made from local teak and cane that adapted modernist principles to local craftsmanship.",
          inspiration_text: "Jeanneret's Chandigarh project is the ultimate masterclass in localization and craft integration. His use of local materials (teak and woven cane) in combination with geometric, sculptural wooden frames inspires our choice of high-quality textiles and traditional weaving techniques.",
          design_principles: JSON.stringify([
            "Local Craftsmanship Integration",
            "V-Shaped Geometric Supports",
            "Natural Weaving (Cane & Rattan)",
            "Sculptural Solid Wood Framing"
          ]),
          notable_works: JSON.stringify([
            "Chandigarh Easy Chair",
            "Office Cane Chair",
            "Committee Chair",
            "Student Desk"
          ]),
          website: "",
          social_links: JSON.stringify({
            pinterest: "https://pinterest.com/pierre_jeanneret_design"
          }),
          sort_order: 3
        }
      ];

      for (const d of defaultDesigners) {
        await query(`
          INSERT INTO designers (id, name, image, short_bio, inspiration_text, design_principles, notable_works, website, social_links, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          d.id,
          d.name,
          d.image,
          d.short_bio,
          d.inspiration_text,
          d.design_principles,
          d.notable_works,
          d.website || null,
          d.social_links,
          d.sort_order
        ]);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Database table 'designers' setup successfully." 
    });
  } catch (error: any) {
    console.error("Error setting up designers table:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withCors(setupHandler);
export const POST = withCors(setupHandler);
export const OPTIONS = withCors(async () => NextResponse.json({}));
