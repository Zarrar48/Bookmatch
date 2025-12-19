# BookMatch - Personalized Book Recommendations

BookMatch is a web application that provides personalized book recommendations based on user preferences, reading habits, and favorite genres/authors. The application uses the Google Books API to fetch books based on the user input. The project consists of two parts: a **Frontend** that handles user interaction and a **Backend** that processes the data and communicates with the Google Books API.

## Project Structure

The project is divided into two main folders:

1. **Frontend** - Contains all the files for the user interface.
   - **index.html**: The main HTML page that forms the structure of the application.
   - **script.js**: JavaScript file that manages interactivity and user input.
   - **style.css**: Custom styles used to enhance the look of the application.

2. **Backend** - Contains the backend logic that handles API calls and processes the user data.
   - **main.py**: The FastAPI backend that processes the user’s preferences and connects with the Google Books API to fetch recommendations.
   - **.env**: A file that holds sensitive environment variables, such as the **Google Books API Key**.

## Features

- **Personalized Book Recommendations**: Based on user preferences like reading habits, genres, and favorite authors.
- **Multi-Step Form**: Collects user preferences in a series of steps, ensuring accurate recommendations.
- **Google Books API Integration**: Fetches book data based on the user’s input.
- **Interactive UI**: Built with Tailwind CSS for a responsive and modern design.
- **Age-based Recommendations**: Suggests books based on the user’s age group and preferences.
- **Real-Time Search**: Users can search for authors and books dynamically.
- **Supports Multiple Formats**: Choose your preferred book format (Physical, eBook, Audiobook).

## Setup Instructions

### Backend Setup

1. **Clone the repository** (or download the project zip file):
   - Ensure you have Python installed.
   - https://www.python.org/downloads/
   
2. **Install Dependencies**:
   - Run the following command in the terminal:
     #### python -m pip install fastapi uvicorn python-dotenv httpx

3. **Google Book API Key**:
   - Create an .env file in Backend Folder and store your google API key there:
     ### GOOGLE_BOOKS_API_KEY=YOUR_API_KEY

4. **Getting the Server Live**:
   - Open the Backend Folder in VS code or any Code Editor
   - Run the following command in terminal:
     #### python -m uvicorn main:app --reload

### Frontend Setup

1. **Clone the repository** (or download the project zip file)

2. **Getting the Frontend Live**:
   - Open the Frontend Folder in VS code or any code editor
   - Open the index.html file with live Server Extension

     OR
   
    - Simply open the index.html file in browser 

## API Endpoints

1. **Search Authors**:

**GET** /search/authors

**Query Parameters**:

**q (string)**: The search query (minimum 2 characters).

**Response**: A list of authors matching the search query.

2. **Search Books**:

**GET** /search/books

**Query Parameters**:

**q (string)**: The search query (minimum 2 characters).

**Response**: A list of book titles matching the search query.

3. **Book Recommendations**:

**POST** /recommend

**Request Body**: A JSON object containing user preferences (Refer to the PreferenceRequest schema).

**Response**: A list of recommended books based on the user's preferences.

## How to Use

1. Open the index.html file in your browser.
2. Fill in your name, date of birth, and reading habits in the form.
3. Select your favorite genres, authors, and preferred book formats.
4. Submit the form, and the backend will process the data and return personalized book recommendations.

## File Structure

/BookMatch

    ├── /Frontend
    
      │    ├── index.html       **Main HTML file for the UI**
    
      │    ├── script.js        **JavaScript file for handling user interactions**
    
      │    └── style.css        **Custom styling for the frontend**
    
    ├── /Backend
    
      │    ├── main.py          **FastAPI backend to handle requests**

      │    └── .env             **Environment file for Google Books API Key**





