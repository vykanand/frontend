import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
    const [jdText, setJdText] = useState('');
    const [results, setResults] = useState([]);
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
            window.location.reload()
            // Optionally, you can trigger a refresh of the search results here
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
                </div>
            )}
            <h2>Upload New resume to db:</h2>
            <input type="file" accept=".pdf" onChange={handleFileChange} />
            <button className="upload-button" onClick={handleUpload} disabled={uploadLoading}>
                {uploadLoading ? 'Uploading...' : 'Upload PDF'}
            </button>
        </div>
    );
};

export default App;
