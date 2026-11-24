import { productsAPI } from "@/lib/api-client"

async function testImport() {
    const sampleProducts = [
        {
            name: "Test Chair 101",
            description: "A comfortable modern chair",
            price: "199.99",
            comparePrice: "249.99",
            costPrice: "100.00",
            category: "Seating",
            stock: "50",
            image: "https://example.com/chair.jpg",
            sku: "CH-101",
            status: "active"
        },
        {
            name: "Test Table 202",
            description: "A solid oak dining table",
            price: "599.99",
            category: "Tables",
            stock: "10",
            sku: "TB-202",
            status: "active"
        }
    ]

    try {
        const result = await productsAPI.bulkCreate(sampleProducts)
        console.log("Import Result:", result)
    } catch (err) {
        console.error("Import Error:", err)
    }
}

testImport()
