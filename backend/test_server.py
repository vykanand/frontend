import pytest
import numpy as np
from unittest.mock import patch
from server import app, generate_normalized_embedding, clean_text, evaluate_model
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
    assert np.isclose(np.linalg.norm(embedding), 1.0)

    #Edge Cases
    with pytest.raises(TypeError):
        generate_normalized_embedding(123)
    with pytest.raises(TypeError):
        generate_normalized_embedding(None)
    assert np.array_equal(generate_normalized_embedding(""), np.zeros(768))


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
    assert clean_text(123) == ""  #Corrected this test case


@patch('server.load_and_process_pdfs')
@patch('server.search_in_faiss')
def test_evaluate_model(mock_search, mock_load):
    #Test Case 1: Successful Search
    mock_load.return_value = ([], np.array([[1.0, 2.0, 3.0]]))
    mock_search.return_value = [("dummy.pdf", 0.9, "Dummy content")]
    test_queries = ["Python developer", "Data scientist"]
    expected_results = [["dummy.pdf"], ["dummy.pdf"]]
    pdf_folder = "dummy_folder"
    metrics = evaluate_model(test_queries, expected_results, pdf_folder)
    assert isinstance(metrics, dict)
    assert all(key in metrics for key in ['precision', 'recall', 'f1_score', 'mrr'])
    assert all(0 <= m <= 1 or math.isnan(m) for m in metrics.values())

    #Test Case 2: Empty Search Results
    mock_search.return_value = []
    metrics = evaluate_model(test_queries, expected_results, pdf_folder)
    assert isinstance(metrics, dict)
    assert all(key in metrics for key in ['precision', 'recall', 'f1_score', 'mrr'])
    assert math.isnan(metrics['precision']) or metrics['precision'] == 0 #Corrected this assertion
    assert math.isnan(metrics['recall']) or metrics['recall'] == 0
    assert math.isnan(metrics['f1_score']) or metrics['f1_score'] == 0
    assert math.isnan(metrics['mrr']) or metrics['mrr'] == 0

    #Test Case 3: Error Handling
    mock_search.side_effect = Exception("Search Error")
    with pytest.raises(Exception):
        evaluate_model(test_queries, expected_results, pdf_folder)

    #Test Case 4: Empty Queries
    mock_search.return_value = [("dummy.pdf", 0.9, "Dummy content")]
    metrics = evaluate_model([], expected_results, pdf_folder)
    assert isinstance(metrics, dict)
    assert all(key in metrics for key in ['precision', 'recall', 'f1_score', 'mrr'])
    assert math.isnan(metrics['precision']) or metrics['precision'] == 0
    assert math.isnan(metrics['recall']) or metrics['recall'] == 0
    assert math.isnan(metrics['f1_score']) or metrics['f1_score'] == 0
    assert math.isnan(metrics['mrr']) or metrics['mrr'] == 0
