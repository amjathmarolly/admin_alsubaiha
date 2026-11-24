import DOMPurify from 'dompurify'

export function generateHtmlDescription(text: string): string {
    if (!text) return ''

    // 1. Basic formatting: split by double newlines to form paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim())

    // 2. Mock AI summarization / formatting
    let htmlSegments: string[] = []

    paragraphs.forEach(p => {
        p = p.trim()

        // Check if paragraph is actually a list
        const lines = p.split('\n').map(l => l.trim()).filter(l => l)
        const isList = lines.length > 1 && lines.every(l => /^[-*•]|\d+\./.test(l))

        if (isList) {
            const listItems = lines.map(item => {
                const cleanItem = item.replace(/^[-*•\d.]+\s*/, '')
                if (cleanItem.includes(':')) {
                    const [head, ...rest] = cleanItem.split(':')
                    return `<li><strong>${head.trim()}:</strong> ${rest.join(':').trim()}</li>`
                }
                return `<li>${cleanItem}</li>`
            }).join('')
            htmlSegments.push(`<ul>${listItems}</ul>`)
        } else {
            let formattedP = p
            // Add emphasis to some keywords
            formattedP = formattedP.replace(/\b(premium|high-quality|durable|elegant|modern|classic|comfortable|luxury|exclusive)\b/gi, '<em>$1</em>')

            // If single line has a colon, make the first part strong
            if (formattedP.includes(':') && lines.length === 1 && formattedP.length < 100) {
                const [head, ...rest] = formattedP.split(':')
                formattedP = `<strong>${head.trim()}:</strong> ${rest.join(':').trim()}`
            }

            // Replace single newlines with <br>
            formattedP = formattedP.replace(/\n/g, '<br>')

            htmlSegments.push(`<p>${formattedP}</p>`)
        }
    })

    let formattedHtml = htmlSegments.join('\n')

    // Add bold highlights specifically for some sentences that look important if there are no strong tags yet
    if (!formattedHtml.includes('<strong>')) {
        // try finding the first sentence, or sentences ending in exclamation mark to bold
        formattedHtml = formattedHtml.replace(/^(<p>)(.*? $[.!?])(\s)/i, '$1<strong>$2</strong>$3')
    }

    // 3. Sanitize
    // The generation happens on the client in the browser standard environment
    if (typeof window !== 'undefined') {
        return DOMPurify.sanitize(formattedHtml, {
            ALLOWED_TAGS: ['p', 'ul', 'li', 'strong', 'em', 'br']
        })
    }

    return formattedHtml
}
