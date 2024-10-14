import pytest
import numpy as np
from unittest.mock import patch
from server import app, generate_normalized_embedding, clean_text, evaluate_model

@pytest.fixture(scope="module")
def test_app():
    app.config['TESTING'] = True
    yield app

@pytest.fixture(scope="module")
def client(test_app):
    return test_app.test_client()

def test_generate_normalized_embedding():
    text = "This is a sample text"
    embedding = generate_normalized_embedding(text)
    assert isinstance(embedding, np.ndarray)
    assert np.isclose(np.linalg.norm(embedding), 1.0)

def test_clean_text():
    text = "This is a TEST email@example.com with http://example.com and special chars !@#$%^&*()"
    cleaned = clean_text(text)
    assert cleaned.islower()

@patch('server.load_and_process_pdfs')
@patch('server.search_in_faiss')
def test_evaluate_model(mock_search, mock_load):
    mock_load.return_value = ([], np.array([[1.0, 2.0, 3.0]]))
    mock_search.return_value = [("dummy.pdf", 0.9, "Dummy content")]
    
    test_queries = ["Python developer", "Data scientist"]
    expected_results = [["dummy.pdf"], ["dummy.pdf"]]
    pdf_folder = "dummy_folder"
    
    metrics = evaluate_model(test_queries, expected_results, pdf_folder)
    
    assert isinstance(metrics, dict)
    assert all(key in metrics for key in ['precision', 'recall', 'f1_score', 'mrr'])
    assert all(0 <= metrics[key] <= 1 for key in metrics)