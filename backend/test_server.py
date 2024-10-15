import pytest
import numpy as np
from unittest.mock import patch, MagicMock
import faiss
import os
from server import app, generate_normalized_embedding, clean_text, process_jd_and_search_in_faiss, search_in_faiss, load_and_process_pdfs
import math

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
    assert np.isclose(np.linalg.norm(embedding), 1.0, atol=1e-6)

    # Edge Cases
    with pytest.raises(TypeError):
        generate_normalized_embedding(123)
    with pytest.raises(TypeError):
        generate_normalized_embedding(None)
    assert np.allclose(generate_normalized_embedding(""), np.zeros(768))

def test_clean_text():
    text = "This is a TEST email@example.com with http://example.com and special chars !@#$%^&*()"
    cleaned = clean_text(text)
    assert cleaned.islower()
    assert "test" in cleaned
    assert "email" not in cleaned
    assert "http" not in cleaned
    assert "!" not in cleaned
    assert "@" not in cleaned

    #Edge Cases
    assert clean_text("") == ""
    assert clean_text(None) == ""
    assert clean_text(123) == ""
    assert clean_text([]) == ""

@patch('server.evaluate_model')
def test_evaluate_route(mock_evaluate_model, client):
    mock_evaluate_model.return_value = {'precision': 0.8, 'recall': 0.7, 'f1_score': 0.75, 'mrr': 0.9}
    response = client.post('/evaluate', json={'test_queries': ['query1', 'query2'], 'expected_results': [['res1', 'res2'], ['res3']]})
    assert response.status_code == 200
    data = response.get_json()
    assert data == {'precision': 0.8, 'recall': 0.7, 'f1_score': 0.75, 'mrr': 0.9}
