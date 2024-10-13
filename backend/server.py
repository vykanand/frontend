import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import torch
import PyPDF2
import re
import nltk
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from nltk.corpus import stopwords

# Ensure you have the necessary NLTK resources
nltk.download('stopwords')

app = Flask(__name__)
CORS(app)

# Function to clean the extracted text
def clean_text(text):
    """
    Cleans the extracted text by removing URLs, email addresses, special characters, digits, extra whitespace and stop words.

    Args:
        text: The extracted text from a PDF.

    Returns:
        The cleaned text.
    """
    # Convert to lowercase
    text = text.lower()
    
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)

    # Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)

    # Remove special characters and digits
    text = re.sub(r'[^a-z\s]', '', text)

    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    # Remove stop words
    stop_words = set(stopwords.words('english'))
    text = ' '.join(word for word in text.split() if word not in stop_words)

    return text

# Function to load PDF files and extract text from them
def load_pdfs_from_folder(folder_path):
    """
    Loads PDF files from a given folder and extracts their text.

    Args:
        folder_path: The path to the folder containing the PDF files.

    Returns:
        A list of tuples, each containing the filename and the cleaned text extracted from the PDF.
    """
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

# Load the SentenceTransformer model for embeddings
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = SentenceTransformer('distilbert-base-nli-stsb-mean-tokens', device=device)

# Function to generate and normalize embedding
def generate_normalized_embedding(text):
    """
    Generates and normalizes an embedding for a given text using the SentenceTransformer model.

    Args:
        text: The text for which the embedding is to be generated.

    Returns:
        The normalized embedding as a NumPy array.
    """
    embedding = model.encode(text)
    return embedding / np.linalg.norm(embedding)

# Function to load and process PDFs to generate normalized embeddings
def load_and_process_pdfs(folder_path):
    """
    Loads PDF files from a folder, extracts their text, and generates normalized embeddings for each text.

    Args:
        folder_path: The path to the folder containing the PDF files.

    Returns:
        A tuple containing:
            - A list of tuples, each containing the filename and the cleaned text.
            - A NumPy array of normalized embeddings for the texts.
    """
    resumes = load_pdfs_from_folder(folder_path)
    embeddings = []
    for filename, text in resumes:
        embedding = generate_normalized_embedding(text)
        embeddings.append(embedding)
    return resumes, np.array(embeddings)

# Function to perform the search in FAISS index
def search_in_faiss(index, query_embedding, resumes, k=5):
    """
    Performs a search in the FAISS index using the query embedding and returns the top k most similar results.

    Args:
        index: The FAISS index.
        query_embedding: The embedding of the query text.
        resumes: A list of tuples, each containing the filename and the cleaned text.
        k: The number of top results to return (default is 5).

    Returns:
        A list of tuples, each containing the filename, similarity score, and the content of the matching resume.
    """
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
    """
    Processes the Job Description text, generates its embedding, loads and processes PDFs, builds FAISS index,
    and performs a search to find the top k most similar resumes.

    Args:
        jd_text: The text of the Job Description.
        folder_path: The path to the folder containing the resume PDFs.
        k: The number of top results to return (default is 5).

    Returns:
        A list of tuples, each containing the filename, similarity score, and the content of the matching resume.
    """
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
    """
    Serves a PDF file from the 'resume-store' directory.

    Args:
        filename: The name of the PDF file to serve.

    Returns:
        The PDF file content.
    """
    return send_from_directory('resume-store', filename)

# Flask route to handle the search request
@app.route('/search', methods=['POST'])
def search():
    """
    Handles the search request by processing the Job Description text, performing the search, and returning the results.

    Returns:
        A JSON response containing the search results.
    """
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

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Handles the upload of a PDF file, saves it to the 'resume-store' directory,
    refreshes the FAISS index, and returns a success message.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and file.filename.endswith('.pdf'):
        filepath = os.path.join('resume-store', file.filename)
        file.save(filepath)

        # Refresh the index after the file is uploaded
        pdf_folder = "resume-store"
        resumes, embeddings = load_and_process_pdfs(pdf_folder)
        index = faiss.IndexFlatIP(len(embeddings[0]))
        embeddings_np = np.array(embeddings).astype('float32')
        index.add(embeddings_np)
        faiss.write_index(index, "faiss_index.index")

        return jsonify({'message': 'File uploaded and index refreshed successfully'}), 200
    else:
        return jsonify({'error': 'File format not supported'}), 400

@app.route('/refresh', methods=['GET'])
def refresh_index():
    """
    Refreshes the FAISS index by reprocessing all PDF files in the 'resume-store' directory.

    Returns:
        A JSON response indicating the success or failure of the index refresh.
    """
    pdf_folder = "resume-store"  # Folder containing resumes
    resumes, embeddings = load_and_process_pdfs(pdf_folder)
    
    # Create a new FAISS index and add embeddings
    index = faiss.IndexFlatIP(len(embeddings[0]))
    embeddings_np = np.array(embeddings).astype('float32')
    index.add(embeddings_np)
    faiss.write_index(index, "faiss_index.index")
    
    return jsonify({"message": "FAISS index refreshed successfully"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

