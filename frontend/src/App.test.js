import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import axios from 'axios';

// Mocking axios
jest.mock('axios', () => ({
  post: jest.fn(),
}));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders upload and search functionality', () => {
    render(<App />);
    expect(screen.getByText(/Upload New Resume:/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter Job Description.../)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  test('handles job description search', async () => {
    render(<App />);
    const jdInput = screen.getByPlaceholderText(/Enter Job Description.../);
    fireEvent.change(jdInput, { target: { value: 'Software Engineer' } });

    axios.post.mockResolvedValueOnce({
      data: [{ filename: 'resume1.pdf', file_link: 'http://example.com/resume1.pdf', similarity_score: 0.9, resume_content: 'Sample content' }]
    }); // Mock search response
    axios.post.mockResolvedValueOnce({ data: { f1_score: 0.6, mrr: 1, precision: 0.7, recall: 0.8 } }); // Mock evaluation response

    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/search', { jd_text: 'Software Engineer' });
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/evaluate', expect.any(Object));
      expect(screen.getByText(/Matching Resumes:/)).toBeInTheDocument();
      expect(screen.getByText(/resume1.pdf/i)).toBeInTheDocument();
    });
  });

  test('displays error message on search failure', async () => {
    render(<App />);
    const jdInput = screen.getByPlaceholderText(/Enter Job Description.../);
    fireEvent.change(jdInput, { target: { value: 'Software Engineer' } });

    axios.post.mockRejectedValueOnce(new Error('Search error')); // Mock failed search

    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching results. Please try again/i)).toBeInTheDocument();
    });
  });

  test('displays evaluation results after successful search', async () => {
    render(<App />);
    const jdInput = screen.getByPlaceholderText(/Enter Job Description.../);
    fireEvent.change(jdInput, { target: { value: 'Software Engineer' } });

    axios.post.mockResolvedValueOnce({
      data: [{ filename: 'resume1.pdf', file_link: 'http://example.com/resume1.pdf', similarity_score: 0.9, resume_content: 'Sample content' }]
    });
    axios.post.mockResolvedValueOnce({ data: { f1_score: 0.8, mrr: 1, precision: 0.8, recall: 0.7 } });

    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/F1 Score:/)).toBeInTheDocument();
      expect(screen.getByText(/Mean Reciprocal Rank \(MRR\):/)).toBeInTheDocument();
      expect(screen.getByText(/Precision:/)).toBeInTheDocument();
      expect(screen.getByText(/Recall:/)).toBeInTheDocument();
    });
  });
});
