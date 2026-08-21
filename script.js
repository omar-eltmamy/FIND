const imageInput = document.getElementById("imageInput");
const heroImage = document.querySelector(".hero-image");

imageInput.addEventListener("change", function () {
    const file = imageInput.files[0];

    if (file) {
        const imageURL = URL.createObjectURL(file);

        heroImage.innerHTML = `<img src="${imageURL}" alt="Uploaded outfit">`;

        document.getElementById("itemSelection").style.display = "block";
    }
});