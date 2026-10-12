# MovieBox — Movie Discovery Web Application

## Project Overview

MovieBox is a responsive movie discovery web application built with React and Vite. It allows users to search for movies and television series, view movie details, filter results by genre, and manage a personal watchlist.

Movie information is retrieved from the OMDb API through a server-side API endpoint.

## Features

- Search for movies and television series.
- Browse movies and TV shows on separate pages.
- View movie details, including plot information.
- Filter search results by genre.
- Add and remove movies from a personal watchlist.
- Save watchlist data in browser localStorage.
- Responsive interface for desktop and mobile devices.
- Loading, empty-result, and API-error handling.

## Technologies Used

- React
- Vite
- JavaScript and JSX
- Material UI
- React Router
- OMDb REST API
- Node.js
- Git and GitHub
- Vercel
- Browser localStorage

## Live Demo

**Live Website:** https://movie-discovery-liard.vercel.app/

**GitHub Repository:** https://github.com/collinstwiine12-commits/movie-discovery

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/collinstwiine12-commits/movie-discovery.git
   ```

2. Enter the project directory:

   ```bash
   cd movie-discovery
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the project root and add your OMDb API key:

   ```env
   OMDB_API_KEY=your_omdb_api_key
   ```

5. Start the local Express API server:

   ```bash
   npm run server
   ```

6. In a second terminal, start the Vite development server:

   ```bash
   npm run dev
   ```

7. Open the local URL displayed by Vite in your browser.

## API Configuration

The OMDb API key is stored in an environment variable and used by the server-side API endpoint. It must not be committed to the repository or exposed in client-side code.

For Vercel deployment, configure `OMDB_API_KEY` in the project's Environment Variables settings.

## Screenshots

### Home Page

![MovieBox Home Page](screenshots/home-page.png)

### Movie Details

![MovieBox Movie Details](screenshots/movie-details.png)

## Author

Developed as a Web and Mobile Application Development assignment.
