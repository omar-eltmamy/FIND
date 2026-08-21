const imageInput = document.getElementById("imageInput");

const scanOverlay = document.getElementById("scanOverlay");
const scanImage = document.getElementById("scanImage");

const resultArea = document.getElementById("resultArea");
const resultImage = document.getElementById("resultImage");

const selectionPanel = document.getElementById("selectionPanel");
const selectedPieceName = document.getElementById("selectedPieceName");
const selectedPieceDescription = document.getElementById("selectedPieceDescription");
const findPieceButton = document.getElementById("findPieceButton");

const cropPreview = document.getElementById("cropPreview");
const cropPreviewImage = document.getElementById("cropPreviewImage");

const productResults = document.getElementById("productResults");
const productResultsTitle = document.getElementById("productResultsTitle");
const productResultsDescription = document.getElementById("productResultsDescription");
const productGrid = document.getElementById("productGrid");
const backToImage = document.getElementById("backToImage");


let selectedPiece = null;
let currentImageURL = null;
let currentImage = null;


// ==========================================
// UPLOAD IMAGE
// ==========================================
async function resizeImageForAI(file) {

    const image =
        await createImageBitmap(file);

    const maxSize = 1600;

    let width =
        image.width;

    let height =
        image.height;


    if (width > maxSize || height > maxSize) {

        const scale =
            Math.min(
                maxSize / width,
                maxSize / height
            );

        width =
            Math.round(
                width * scale
            );

        height =
            Math.round(
                height * scale
            );

    }


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        width;

    canvas.height =
        height;


    const context =
        canvas.getContext(
            "2d"
        );


    context.drawImage(
        image,
        0,
        0,
        width,
        height
    );


    return new Promise(
        (resolve) => {

            canvas.toBlob(
                (blob) => {

                    resolve(blob);

                },
                "image/jpeg",
                0.85
            );

        }
    );

}


imageInput.addEventListener("change", async function () {

    const file = imageInput.files[0];

    if (!file) return;


    currentImageURL =
        URL.createObjectURL(file);


    scanImage.innerHTML = `
        <img
            src="${currentImageURL}"
            alt="Uploaded image"
        >
    `;


    scanOverlay.style.display =
        "flex";


    const formData =
        new FormData();


    const optimizedFile =
        await resizeImageForAI(file);


    formData.append(
        "image",
        optimizedFile,
        "find-image.jpg"
    );


    try {

        // ==========================================
        // GEMINI ANALYSIS
        // ==========================================

        const response =
            await fetch(
                "https://find-production-61f1.up.railway.app/analyze",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        console.log(
            "AI RESPONSE:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                "AI analysis failed."
            );

        }


        const result =
            data.result;


        console.log(
            "Detected pieces:",
            result.items
        );


        // ==========================================
        // SHOW RESULTS
        // ==========================================

        scanOverlay.style.display =
            "none";


        document
            .querySelector(".workspace-content")
            .style.display =
            "none";


        resultArea.style.display =
            "block";


        productResults.style.display =
            "none";


        selectionPanel.style.display =
            "none";


        cropPreview.style.display =
            "none";


        selectedPiece =
            null;


        // ==========================================
        // LOAD IMAGE
        // ==========================================

        currentImage =
            new Image();


        currentImage.onload = () => {

            console.log(
                "Image loaded:",
                currentImage.naturalWidth,
                "x",
                currentImage.naturalHeight
            );

        };


        currentImage.src =
            currentImageURL;


        // ==========================================
        // DISPLAY IMAGE
        // ==========================================

        resultImage.innerHTML = `

            <div class="detected-image">

                <img
                    src="${currentImageURL}"
                    alt="Uploaded image"
                >

                <div class="detection-boxes"></div>

            </div>

        `;


        const detectionBoxes =
            resultImage.querySelector(
                ".detection-boxes"
            );


        // ==========================================
        // CREATE DETECTION BOXES
        // ==========================================

        result.items.forEach(
            (item) => {

                const box =
                    item.box;


                const detectionBox =
                    document.createElement(
                        "button"
                    );


                detectionBox.className =
                    "detection-box";


                detectionBox.type =
                    "button";


                detectionBox.style.left =
                    `${box.x / 10}%`;


                detectionBox.style.top =
                    `${box.y / 10}%`;


                detectionBox.style.width =
                    `${box.width / 10}%`;


                detectionBox.style.height =
                    `${box.height / 10}%`;


                detectionBox.dataset.item =
                    item.name;


                detectionBox.innerHTML = `
                    <span>
                        ${item.name}
                    </span>
                `;


                // ==========================================
                // SELECT PIECE
                // ==========================================

                detectionBox.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".detection-box"
                            )
                            .forEach(
                                (boxElement) => {

                                    boxElement.classList.remove(
                                        "selected"
                                    );

                                }
                            );


                        detectionBox.classList.add(
                            "selected"
                        );


                        selectedPiece =
                            item;


                        console.log(
                            "SELECTED PIECE:",
                            selectedPiece
                        );


                        selectedPieceName.textContent =
                            item.name;


                        selectedPieceDescription.textContent =
                            item.description;


                        selectionPanel.style.display =
                            "block";


                        createPieceCrop(
                            item
                        );

                    }
                );


                detectionBoxes.appendChild(
                    detectionBox
                );

            }
        );


    } catch (error) {

        console.error(
            "FIND ERROR:",
            error
        );


        scanOverlay.style.display =
            "none";


        alert(
            "Something went wrong while analyzing the image."
        );

    }

});


// ==========================================
// CREATE PIECE CROP
// ==========================================

function createPieceCrop(item) {

    if (
        !currentImage ||
        !currentImage.complete
    ) {

        console.log(
            "Waiting for image to load..."
        );


        currentImage.onload = () => {

            createPieceCrop(
                item
            );

        };


        return;

    }


    const imageWidth =
        currentImage.naturalWidth;


    const imageHeight =
        currentImage.naturalHeight;


    const box =
        item.box;


    const x =
        Math.round(
            (box.x / 1000) *
            imageWidth
        );


    const y =
        Math.round(
            (box.y / 1000) *
            imageHeight
        );


    const width =
        Math.round(
            (box.width / 1000) *
            imageWidth
        );


    const height =
        Math.round(
            (box.height / 1000) *
            imageHeight
        );


    console.log(
        "REAL CROP COORDINATES:",
        {
            x,
            y,
            width,
            height
        }
    );


    // ==========================================
    // CANVAS
    // ==========================================

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        width;


    canvas.height =
        height;


    const context =
        canvas.getContext(
            "2d"
        );


    context.drawImage(

        currentImage,

        x,
        y,
        width,
        height,

        0,
        0,
        width,
        height

    );


    // ==========================================
    // CREATE CROP
    // ==========================================

    const croppedImageURL =
        canvas.toDataURL(
            "image/jpeg",
            0.9
        );


    console.log(
        "PIECE CROP CREATED:",
        {
            name: item.name,
            x,
            y,
            width,
            height
        }
    );


    selectedPiece.crop =
        croppedImageURL;


    cropPreviewImage.src =
        croppedImageURL;


    cropPreview.style.display =
        "block";

}


// ==========================================
// FIND THIS
// ==========================================

findPieceButton.addEventListener(
    "click",
    async () => {

        if (
            !selectedPiece ||
            !selectedPiece.crop
        ) {

            return;

        }


        console.log(
            "VISUAL SEARCH STARTED:",
            selectedPiece.name
        );


        findPieceButton.disabled =
            true;


        findPieceButton.textContent =
            "SEARCHING...";


        try {

            // ==========================================
            // CONVERT CROP TO BLOB
            // ==========================================

            const response =
                await fetch(
                    selectedPiece.crop
                );


            const blob =
                await response.blob();


            const formData =
                new FormData();


            formData.append(
                "image",
                blob,
                "piece.jpg"
            );


            // ==========================================
            // VISUAL SEARCH SERVER
            // ==========================================

            const searchResponse =
                await fetch(
                    "https://find-production-ffd2.up.railway.app/search",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const data =
                await searchResponse.json();


            console.log(
                "VISUAL SEARCH RESULTS:",
                data
            );


            if (!searchResponse.ok) {

                throw new Error(
                    data.error ||
                    "Visual search failed."
                );

            }


            showProductResults(
                selectedPiece,
                data.results
            );


        } catch (error) {

            console.error(
                "VISUAL SEARCH ERROR:",
                error
            );


            alert(
                "Something went wrong while searching."
            );


        } finally {

            findPieceButton.disabled =
                false;


            findPieceButton.textContent =
                "FIND THIS";

        }

    }
);


// ==========================================
// PRODUCT RESULTS
// ==========================================

function showProductResults(
    item,
    results
) {

    resultArea.style.display =
        "none";


    productResults.style.display =
        "block";


    productResultsTitle.textContent =
        item.name;


    productResultsDescription.textContent =
        "Visually similar pieces from the FIND catalog.";


    productGrid.innerHTML =
        "";


    if (
        !results ||
        results.length === 0
    ) {

        productGrid.innerHTML = `
            <p>
                No visually similar products found.
            </p>
        `;

        return;

    }


    results.forEach(
        (product) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "product-card";


            const price =
                product.price !== undefined
                    ? `${product.currency || ""} ${product.price}`
                    : "";


            card.innerHTML = `

                <div class="product-image">

                    <img
                        src="https://find-production-ffd2.up.railway.app/catalog/${product.image}"
                        alt="${product.name || "Product"}"
                    >

                </div>


                <div class="product-info">

                    <h3>
                        ${product.name || "Unnamed product"}
                    </h3>


                    <p class="product-store">
                        ${product.store || "Unknown store"}
                    </p>


                    <p class="product-price">
                        ${price}
                    </p>

                </div>

            `;


            // ==========================================
            // PRODUCT LINK
            // ==========================================

            if (
                product.url &&
                product.url !== "#"
            ) {

                card.style.cursor =
                    "pointer";


                card.addEventListener(
                    "click",
                    () => {

                        window.open(
                            product.url,
                            "_blank"
                        );

                    }
                );

            }


            productGrid.appendChild(
                card
            );

        }
    );

}


// ==========================================
// BACK TO IMAGE
// ==========================================

backToImage.addEventListener(
    "click",
    () => {

        productResults.style.display =
            "none";


        resultArea.style.display =
            "block";

    }
);