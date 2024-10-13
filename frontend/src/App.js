import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
    const [jdText, setJdText] = useState('');
    const [results, setResults] = useState([]);
    const [evaluationResults, setEvaluationResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [file, setFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    const handleSearch = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('http://localhost:5000/search', {
                jd_text: jdText
            });
            setResults(response.data);

            // Automatically evaluate after getting search results
            if (response.data.length > 0) {
                const expectedResults = [response.data[0].filename];
                const evalResponse = await axios.post('http://localhost:5000/evaluate', {
                    test_queries: [jdText],
                    expected_results: expectedResults
                });
                setEvaluationResults(evalResponse.data);
            }
        } catch (err) {
            setError('Error fetching results. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a PDF file to upload.');
            return;
        }

        setUploadLoading(true);
        setError('');
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post('http://localhost:5000/upload', formData);
            alert('File uploaded successfully. Refreshing index...');
            window.location.reload();
        } catch (err) {
            setError('Error uploading file. Please try again.');
        } finally {
            setUploadLoading(false);
            setFile(null); // Reset the file input
        }
    };

    useEffect(() => {
        document.title = "Resume Matching App";
    }, []);

    return (
        <div className="app">
            <h2>Upload New Resume:</h2>
            <input type="file" accept=".pdf" onChange={handleFileChange} />
            <button className="upload-button" onClick={handleUpload} disabled={uploadLoading}>
                {uploadLoading ? 'Uploading...' : 'Upload PDF'}
            </button>
            <br /><br /><br /><br />
            
            <h1 className="title">Job Description Search</h1>
            <textarea
                className="jd-input"
                placeholder="Enter Job Description..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
            />
            <button className="search-button" onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
            </button>
            {error && <div className="error">{error}</div>}
            {results.length > 0 && (
                <div className="results">
                    <h2>Matching Resumes:</h2>
                    <ul>
                        {results.map((result, index) => (
                            <li key={index}>
                                <a href={result.file_link} target="_blank" rel="noopener noreferrer">
                                    {result.filename}
                                </a>
                                <p>Similarity Score: {result.similarity_score.toFixed(4)}</p>
                                <p>{result.resume_content}</p>
                            </li>
                        ))}
                    </ul>
                    {evaluationResults && (
                        <div className="evaluation-results">
                            <h2>Performance Evaluation Results:</h2>
                            <p><strong>F1 Score:</strong> {evaluationResults.f1_score.toFixed(4)} - {evaluationResults.f1_score < 0.5 ? "A low F1 score suggests that the model is not effectively retrieving relevant resumes." : "This is a decent F1 score."}</p>
                            <p><strong>Mean Reciprocal Rank (MRR):</strong> {evaluationResults.mrr} - {evaluationResults.mrr < 1 ? "This indicates that the model could improve in retrieving relevant results at the top." : "Your model performs well with the top result being relevant."}</p>
                            <p><strong>Precision:</strong> {evaluationResults.precision.toFixed(4)} - {evaluationResults.precision < 0.5 ? "This indicates that many of the returned resumes may not match the JD well.Add More Resumes to the system to get better results" : "This is a reasonable precision score."}</p>
                            <p><strong>Recall:</strong> {evaluationResults.recall.toFixed(4)} - {evaluationResults.recall < 0.5 ? "A low recall indicates that many relevant resumes were missed by the search.Add More Resumes to the system to get better results" : "This is a good recall score."}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default App;
