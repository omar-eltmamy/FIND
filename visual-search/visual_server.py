import os
import json
import torch

from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from transformers import CLIPImageProcessor, CLIPVisionModelWithProjection


# ==========================================
# FLASK
# ==========================================

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "https://omar-eltmamy.github.io"
            ]
        }
    }
)


# ==========================================
# FILE PATHS
# ==========================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

CATALOG_FOLDER = os.path.join(
    BASE_DIR,
    "catalog"
)

CATALOG_DATA_FILE = os.path.join(
    BASE_DIR,
    "catalog.json"
)

EMBEDDINGS_FILE = os.path.join(
    BASE_DIR,
    "catalog_embeddings.pt"
)


# ==========================================
# LOAD PRODUCT DATA
# ==========================================

print("Loading catalog products...")

with open(
    CATALOG_DATA_FILE,
    "r",
    encoding="utf-8"
) as file:

    catalog_data = json.load(file)


catalog_data_by_image = {
    product["image"]: product
    for product in catalog_data
}


print(
    "Catalog products loaded:",
    len(catalog_data)
)


# ==========================================
# LOAD CLIP VISION MODEL
# ==========================================

print("Loading FIND visual model...")

processor = CLIPImageProcessor.from_pretrained(
    "openai/clip-vit-base-patch32"
)

model = CLIPVisionModelWithProjection.from_pretrained(
    "openai/clip-vit-base-patch32",
    low_cpu_mem_usage=True
)

model.eval()

print("FIND visual model loaded!")


# ==========================================
# LOAD CATALOG EMBEDDINGS
# ==========================================

print("Loading catalog embeddings...")

catalog = torch.load(
    EMBEDDINGS_FILE,
    weights_only=False
)

print(
    "Catalog embeddings loaded:",
    len(catalog)
)


# ==========================================
# CREATE IMAGE EMBEDDING
# ==========================================

def get_embedding(image):

    image.thumbnail((768, 768))

    inputs = processor(
        images=image,
        return_tensors="pt"
    )

    with torch.inference_mode():

        features = model(
            **inputs
        ).image_embeds

    features = features / features.norm(
        dim=-1,
        keepdim=True
    )

    return features.squeeze(0)


# ==========================================
# SEARCH CATALOG
# ==========================================

def search_catalog(image):

    query_embedding = get_embedding(
        image
    )

    results = []

    for product in catalog:

        similarity = torch.matmul(
            query_embedding,
            product["embedding"]
        )

        score = float(
            similarity.item()
        )

        product_info = catalog_data_by_image.get(
            product["image"],
            {}
        )

        results.append({

            **product_info,

            "image": product["image"],

            "score": score

        })

    results.sort(
        key=lambda item: item["score"],
        reverse=True
    )

    return results


# ==========================================
# SERVE CATALOG IMAGES
# ==========================================

@app.get("/catalog/<path:filename>")
def catalog_file(filename):

    return send_from_directory(
        CATALOG_FOLDER,
        filename
    )


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return "FIND visual search is running."


# ==========================================
# VISUAL SEARCH
# ==========================================

@app.post("/search")
def search():

    if "image" not in request.files:

        return jsonify({
            "error": "No image uploaded."
        }), 400

    file = request.files["image"]

    try:

        image = Image.open(
            file.stream
        ).convert("RGB")

        results = search_catalog(
            image
        )

        return jsonify({

            "results": results

        })

    except Exception as error:

        print(
            "SEARCH ERROR:",
            error
        )

        return jsonify({

            "error": str(error)

        }), 500


# ==========================================
# START SERVER
# ==========================================

if __name__ == "__main__":

    print(
        "Starting FIND visual search server..."
    )

    port = int(
        os.environ.get(
            "PORT",
            5000
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )