import os
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

print("Loading FIND visual model...")

model = CLIPModel.from_pretrained(
    "openai/clip-vit-base-patch32",
    low_cpu_mem_usage=True
)

processor = CLIPProcessor.from_pretrained(
    "openai/clip-vit-base-patch32"
)

model.eval()

print("Model loaded!")


CATALOG_FOLDER = "catalog"
OUTPUT_FILE = "catalog_embeddings.pt"


def get_embedding(image):

    inputs = processor(
        images=image,
        return_tensors="pt"
    )

    with torch.no_grad():
        features = model.get_image_features(
            **inputs
        ).pooler_output

    features = features / features.norm(
        dim=-1,
        keepdim=True
    )

    return features.squeeze(0)


catalog = []


print("\nBuilding catalog embeddings...\n")


for filename in os.listdir(CATALOG_FOLDER):

    if not filename.lower().endswith(
        (".jpg", ".jpeg", ".png", ".webp")
    ):
        continue

    path = os.path.join(
        CATALOG_FOLDER,
        filename
    )

    try:

        image = Image.open(
            path
        ).convert("RGB")

        embedding = get_embedding(
            image
        )

        catalog.append({
            "image": filename,
            "embedding": embedding
        })

        print(
            "Processed:",
            filename
        )

    except Exception as error:

        print(
            "ERROR:",
            filename,
            error
        )


torch.save(
    catalog,
    OUTPUT_FILE
)


print("\nCatalog complete!")

print(
    "Products indexed:",
    len(catalog)
)

print(
    "Saved to:",
    OUTPUT_FILE
)
