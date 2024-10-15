import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from './App';
import axios from 'axios';

// Mocking axios
jest.mock('axios', () => ({
  post: jest.fn(),
}));

// Mock window.URL.createObjectURL
window.URL.createObjectURL = jest.fn();


describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn(); //Simplified mocking
  });

  test('renders upload and search functionality', () => {
    render(<App />);
    expect(screen.getByLabelText(/Upload New Resume/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enter Job Description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
    expect(screen.getByTestId('app')).toBeInTheDocument(); 
  });

  test('handles job description search', async () => {
    render(<App />);
    const jdInput = screen.getByLabelText(/Enter Job Description/i);
    fireEvent.change(jdInput, { target: { value: 'Software Engineer' } });

    axios.post.mockResolvedValueOnce({
      data: [{ filename: 'resume1.pdf', file_link: 'http://example.com/resume1.pdf', similarity_score: 0.9, resume_content: 'Sample content' }]
    }); 
    axios.post.mockResolvedValueOnce({ data: { f1_score: 0.6, mrr: 1, precision: 0.7, recall: 0.8 } }); 

    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);

    expect(await screen.findByText(/Matching Resumes:/)).toBeInTheDocument();
    expect(await screen.findByText(/resume1.pdf/i)).toBeInTheDocument();
    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/search', { jd_text: 'Software Engineer' });
    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/evaluate', expect.any(Object));
  });

  test('displays error message on search failure', async () => {
    render(<App />);
    const jdInput = screen.getByLabelText(/Enter Job Description/i);
    fireEvent.change(jdInput, { target: { value: 'Software Engineer' } });

    axios.post.mockRejectedValueOnce(new Error('Search error')); 

    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);

    expect(await screen.findByText(/Error fetching results. Please try again/i)).toBeInTheDocument();
  });

  test('displays evaluation results after successful search', async () => {
    render(<App />);
    const jdInput = screen.getByLabelText(/Enter Job Description/i);
    fireEvent.change(jdInput, { target: { value: 'Software Engineer' } });

    axios.post.mockResolvedValueOnce({
      data: [{ filename: 'resume1.pdf', file_link: 'http://example.com/resume1.pdf', similarity_score: 0.9, resume_content: 'Sample content' }]
    });
    axios.post.mockResolvedValueOnce({ data: { f1_score: 0.8, mrr: 1, precision: 0.8, recall: 0.7 } });

    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);

    expect(await screen.findByText(/F1 Score:/)).toBeInTheDocument();
    expect(await screen.findByText(/Mean Reciprocal Rank \(MRR\):/)).toBeInTheDocument();
    expect(await screen.findByText(/Precision:/)).toBeInTheDocument();
    expect(await screen.findByText(/Recall:/)).toBeInTheDocument();
  });

  test('handles empty job description search', async () => {
    render(<App />);
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    expect(await screen.findByText(/Please enter a job description/i)).toBeInTheDocument();
  });

  test('handles multiple search results', async () => {
    render(<App />);
    const jdInput = screen.getByLabelText(/Enter Job Description/i);
    fireEvent.change(jdInput, { target: { value: 'Software Engineer' } });

    axios.post.mockResolvedValueOnce({
      data: [
        { filename: 'resume1.pdf', file_link: 'http://example.com/resume1.pdf', similarity_score: 0.9, resume_content: 'Sample content 1' },
        { filename: 'resume2.pdf', file_link: 'http://example.com/resume2.pdf', similarity_score: 0.8, resume_content: 'Sample content 2' },
      ]
    });
    axios.post.mockResolvedValueOnce({ data: { f1_score: 0.8, mrr: 1, precision: 0.8, recall: 0.7 } });

    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      const resultsContainer = screen.getByTestId('search-results');
      expect(within(resultsContainer).getAllByRole('link')).toHaveLength(2);
    });
    expect(await screen.findByText(/resume1.pdf/i)).toBeInTheDocument();
    expect(await screen.findByText(/resume2.pdf/i)).toBeInTheDocument();
  });

  test('handles resume upload', async () => {
    render(<App />);
    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const uploadInput = screen.getByLabelText(/Upload New Resume/i);
    
    Object.defineProperty(uploadInput, 'files', {
      value: [file]
    });
    
    fireEvent.change(uploadInput);

    axios.post.mockResolvedValueOnce({ data: { message: 'File uploaded successfully' } });

    const uploadButton = screen.getByRole('button', { name: /Upload PDF/i });
    fireEvent.click(uploadButton);

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/upload', expect.any(FormData)));
    expect(window.alert).toHaveBeenCalledWith('File uploaded successfully. Refreshing index...'); 
  });
});
