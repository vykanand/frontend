import React, { useState, useEffect} from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
    const [jdText, setJdText] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
        </div>
    );
};

export default App;
