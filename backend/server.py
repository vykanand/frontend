import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import torch
import PyPDF2
import re
import hashlib
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Function to load PDF files and extract text from them
def load_pdfs_from_folder(folder_path):
    resumes = []
    for filename in os.listdir(folder_path):
        if filename.endswith('.pdf'):
            with open(os.path.join(folder_path, filename), 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
                cleaned_text = clean_text(text)
                resumes.append((filename, cleaned_text.strip()))
    return resumes

# Function to clean the extracted text
def clean_text(text):
    text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces and newlines
    return text.strip().lower()  # Convert to lowercase

# Load the SentenceTransformer model for embeddings
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = SentenceTransformer('distilbert-base-nli-stsb-mean-tokens', device=device)

# Function to generate and normalize embedding
def generate_normalized_embedding(text):
    embedding = model.encode(text)
    return embedding / np.linalg.norm(embedding)

# Function to load and process PDFs to generate normalized embeddings
def load_and_process_pdfs(folder_path):
    resumes = load_pdfs_from_folder(folder_path)
    embeddings = []
    for filename, text in resumes:
        embedding = generate_normalized_embedding(text)
        embeddings.append(embedding)
    return resumes, np.array(embeddings)

# Function to perform the search in FAISS index
def search_in_faiss(index, query_embedding, resumes, k=5):
    query_embedding = np.array(query_embedding).reshape(1, -1).astype('float32')
    distances, indices = index.search(query_embedding, k)

    results = []
    for i in range(k):
        idx = indices[0][i]
        if idx >= 0:  # Valid indices
            filename, content = resumes[idx]
            score = distances[0][i]
            results.append((filename, score, content))
    return results

# Function to process Job Description (JD) and perform the search
def process_jd_and_search_in_faiss(jd_text, folder_path, k=5):
    jd_embedding = generate_normalized_embedding(jd_text.lower())
    resumes, embeddings = load_and_process_pdfs(folder_path)

    index_file_path = "faiss_index.index"
    if os.path.exists(index_file_path):
        index = faiss.read_index(index_file_path)
    else:
        index = faiss.IndexFlatIP(len(embeddings[0]))
        embeddings_np = np.array(embeddings).astype('float32')
        index.add(embeddings_np)
        faiss.write_index(index, index_file_path)

    results = search_in_faiss(index, jd_embedding, resumes, k)
    return results

# Serve PDF files from the resume-store directory
@app.route('/resume-store/<path:filename>', methods=['GET'])
def serve_resume(filename):
    return send_from_directory('resume-store', filename)

# Flask route to handle the search request
@app.route('/search', methods=['POST'])
def search():
    data = request.json
    jd_text = data.get('jd_text')
    pdf_folder = "resume-store"  # Folder containing resumes
    results = process_jd_and_search_in_faiss(jd_text, pdf_folder)

    response = []
    base_url = "http://localhost:5000/resume-store/"  # Your server URL

    for filename, score, content in results:
        cleaned_content = clean_text(content)  # Clean the content for display
        response.append({
            'filename': filename,
            'file_link': base_url + filename,  # Construct the link to the file
            'similarity_score': float(score),  # Convert to standard Python float
            'resume_content': cleaned_content[:300]  # First 300 characters
        })

    return jsonify(response)

# Run this Flask route to refresh the FAISS index after NEW PDF files are uploaded
@app.route('/refresh_index', methods=['GET'])
def refresh_index():
    pdf_folder = "resume-store"
    resumes, embeddings = load_and_process_pdfs(pdf_folder)
    index = faiss.IndexFlatIP(len(embeddings[0]))
    embeddings_np = np.array(embeddings).astype('float32')
    index.add(embeddings_np)
    faiss.write_index(index, "faiss_index.index")
    return jsonify({"message": "Index refreshed successfully"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
