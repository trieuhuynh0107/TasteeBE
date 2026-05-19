import torch
import json
import os

MODEL_PATH = 'Model/ngcf_baseline.pth'
OUTPUT_PATH = 'scripts/item_embeddings.json'

def extract_embeddings():
    print(f"Loading model from: {MODEL_PATH}")
    checkpoint = torch.load(MODEL_PATH, map_location='cpu', weights_only=False)
    
    if 'state_dict' not in checkpoint:
        print("Error: 'state_dict' not found in checkpoint.")
        return
        
    state_dict = checkpoint['state_dict']
    
    if 'item_embedding.weight' not in state_dict:
        print("Error: 'item_embedding.weight' not found in state_dict.")
        return
        
    item_embeddings = state_dict['item_embedding.weight'].detach().cpu().numpy()
    
    print(f"Extracted item embeddings with shape: {item_embeddings.shape}")
    
    # Chuyển đổi thành dictionary { index: [vector] }
    embeddings_dict = {}
    for i, emb in enumerate(item_embeddings):
        # Lưu array dưới dạng list để có thể dump ra JSON
        embeddings_dict[str(i)] = emb.tolist()
        
    print(f"Saving to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(embeddings_dict, f)
        
    print(f"Successfully saved {len(embeddings_dict)} item embeddings.")

if __name__ == "__main__":
    extract_embeddings()
