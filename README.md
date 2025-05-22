
# ContentForge AI

ContentForge AI is a Next.js application designed to assist with content creation and planning using AI. It leverages OpenAI through Genkit to generate content tailored for platforms like WordPress, Instagram, and Facebook, suggest content themes, generate hashtags, summarize text, and more.

## Core Features

*   **AI Content Generation**: Generate content for WordPress (HTML), Instagram, and Facebook.
*   **Customizable Content Parameters**: Define topics, approximate word counts, and the number of desired images for WordPress content.
*   **Automated Image Prompts**: Generates image prompts based on the content, with placeholders for WordPress.
*   **AI Image Generation**: Generate actual images from prompts using AI (currently configured for Google's Gemini 2.0 Flash experimental model via Genkit).
*   **Proactive Theme Planning**: AI suggests content themes including titles, descriptions, and keywords. Users can add manual notes to themes.
*   **Smart Hashtag/Keyword Suggestions**: Suggests relevant hashtags for social media or long-tail keywords for general content ideas.
*   **Text Summarizer**: Summarizes provided text, with options to save, edit, copy, and send summaries as notes to the Theme Planner.
*   **Content Organization & Filtering**: View and manage generated content with filters for platform, status, and date.
*   **Settings Configuration**: Manage OpenAI API Key (via `.env`) and default output language for AI-generated content.
*   **Responsive UI**: Built with ShadCN UI components and Tailwind CSS for a modern and clean interface.

## Tech Stack

*   **Framework**: Next.js (App Router)
*   **UI Library**: React
*   **AI Integration**: Genkit (with OpenAI as the primary provider for text, and Google AI for image generation as per initial setup)
*   **Styling**: Tailwind CSS
*   **UI Components**: ShadCN UI
*   **Language**: TypeScript

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm (or yarn)
*   An OpenAI API Key

### Environment Setup

1.  **Clone the repository (if applicable) or start with your Firebase Studio project.**
2.  **Create a `.env` file** in the root of your project.
3.  **Add your OpenAI API Key** to the `.env` file:
    ```env
    OPENAI_API_KEY=your_openai_api_key_here
    ```
    Replace `your_openai_api_key_here` with your actual OpenAI API key. This key is used by Genkit for all OpenAI-powered AI flows.
4.  **(Optional) Google AI API Key for Image Generation**: If you plan to use the AI image generation feature (which currently uses `googleai/gemini-2.0-flash-exp`), you will also need a Google AI API Key. Add it to your `.env` file:
    ```env
    GEMINI_API_KEY=your_google_ai_api_key_here
    ```
    If this is not set, image generation will fail.

### Installation

Navigate to the project directory in your terminal and install the dependencies:

```bash
npm install
```
or if you use yarn:
```bash
yarn install
```

### Running the Development Servers

You need to run two development servers concurrently for full functionality:

1.  **Next.js Development Server**:
    ```bash
    npm run dev
    ```
    This will typically start the Next.js app on `http://localhost:9002` (as per your `package.json`).

2.  **Genkit Development Server**:
    Genkit flows are managed by a separate development server.
    *   To start it once:
        ```bash
        npm run genkit:dev
        ```
    *   To start it and have it watch for changes in your AI flow files:
        ```bash
        npm run genkit:watch
        ```
    This server usually runs on `http://localhost:3400` and provides a UI to inspect and test your Genkit flows.

### Building for Production

To create a production build:
```bash
npm run build
```
And to start the production server:
```bash
npm run start
```

## Project Structure Overview

*   `src/app/`: Contains the page routes and layouts (Next.js App Router).
    *   `globals.css`: Global styles and Tailwind CSS theme configuration (HSL variables).
    *   `layout.tsx`: Root layout for the application.
    *   `page.tsx`: The main dashboard page.
    *   `content/`: Routes for creating, editing, and previewing content.
    *   `settings/`: Settings page.
    *   `summarizer/`: Text summarizer page.
    *   `themes/`: Theme planner page.
*   `src/components/`: Reusable UI components.
    *   `content/`: Components related to content items (form, list, card, editor).
    *   `layout/`: Layout components (AppHeader, AppSidebar, Logo).
    *   `settings/`: Components for the settings page.
    *   `summarizer/`: Components for the summarizer.
    *   `themes/`: Components for the theme planner.
    *   `ui/`: ShadCN UI components.
*   `src/ai/`: Genkit AI integration.
    *   `genkit.ts`: Genkit global configuration (plugins, default model).
    *   `dev.ts`: Entry point for the Genkit development server, imports all flows.
    *   `flows/`: Directory containing all the Genkit AI flows (e.g., `generate-content-for-platform.ts`, `proactive-theme-planning.ts`, `summarize-text-flow.ts`, `generate-image-flow.ts`).
*   `src/lib/`: Utility functions, constants, type definitions, and local storage services.
    *   `constants.ts`: Application-wide constants (app name, nav links, storage keys, etc.).
    *   `storageService.ts`: Functions for interacting with browser `localStorage` to persist data.
    *   `types.ts`: TypeScript type definitions for data structures.
    *   `utils.ts`: Utility functions (like `cn` for class names).
*   `public/`: Static assets.

## Key Functionalities & How to Use Them

### 1. Content Dashboard (`/`)
*   Displays a list of all created content items as cards.
*   Allows filtering content by search term, platform, status, and date range.
*   Each card shows the title, platform icon, creation date, topic, status, and hashtags.
*   Actions per card:
    *   **View (Eye Icon / Title Click)**: Navigates to a live preview page for the content.
    *   **Edit (Pencil Icon)**: Opens the content in the "Create/Edit Content" form.
    *   **Delete (Trash Icon)**: Deletes the content item after confirmation.

### 2. Create/Edit Content (`/content/new`, `/content/[id]/edit`)
*   **Form Fields**: Title, Platform (WordPress, Instagram, Facebook), Topic/Brief, Approximate Word Count (optional).
*   **WordPress Specific**: "Número de Imagens" (Number of Images).
    *   If > 0, AI will embed that many image prompts and `<img>` placeholders in the HTML.
    *   If 0, AI will provide one general image prompt (not embedded).
*   **AI Content Generation**:
    *   Click "Generate Content with AI" to have the AI generate content based on the inputs.
    *   If "Manual Reference Materials" were passed from Theme Planner or added, they are used.
*   **HTML Editor (WordPress)**: For WordPress, content is generated as HTML. An editor with a live preview is provided.
*   **Image Prompts & Generation**:
    *   Generated image prompts are displayed.
    *   A "Gerar Imagem" button next to each prompt uses AI (Gemini 2.0 Flash) to generate an image from that prompt. The generated image is displayed.
*   **Hashtag Suggestions (Instagram/Facebook)**:
    *   After content is generated, click "Suggest Hashtags" to get AI-powered hashtag suggestions.
*   **Saving**:
    *   If creating new content, or if the platform is changed while editing, it saves as a new draft.
    *   If editing existing content without changing the platform, it updates the content.

### 3. Theme Planner (`/themes`)
*   **Suggest Themes**: Input a general topic and desired number of suggestions. AI generates:
    *   Catchy titles.
    *   Brief descriptions.
    *   ~5 relevant keywords.
    *   Output language respects settings.
*   **Save Ideas**: Suggested themes can be saved for later use.
*   **Saved Theme Ideas**:
    *   Displayed as cards with title, description, original topic, keywords, and saved date.
    *   **AI Keyword/Search Term Ideas**: Click "Suggest Terms" to get long-tail keywords/search terms based on the theme's title and description (uses the `suggestHashtags` flow with "general" platform). These are saved with the theme. Keywords have an 'x' to delete them.
    *   **Manual Notes/References**:
        *   Add custom notes (title, content) to each saved theme via a dialog.
        *   Notes are displayed as cards and can be deleted.
        *   Select notes with checkboxes to pass their content to the "Create Content" page.
    *   **Actions**:
        *   **Delete Theme**: Removes the theme idea.
        *   **Create Content**: Navigates to `/content/new`, pre-filling the title, topic, and selected manual notes from the theme.

### 4. Text Summarizer (`/summarizer`)
*   **Input Text**: Provide text to be summarized.
*   **Language Selection**: Choose the output language for the summary.
*   **AI Summarization**: Generates an organized summary of the main points.
*   **Actions on Current Summary**:
    *   **Copy Summary**.
    *   **Save Summary**: Saves the input text, summary, and language to local storage. Fields are cleared after saving.
*   **Saved Summaries History**:
    *   Lists all saved summaries.
    *   Each saved item allows:
        *   **Edit**: Loads the summary back into the form for modification or re-summarization.
        *   **Copy Output**.
        *   **Send as Note to Theme**: Opens a dialog to select a saved theme from Theme Planner and adds the summary as a manual note to it.
        *   **Delete**: Removes the saved summary.
    *   **Clear All History**: Deletes all saved summaries.

### 5. Settings (`/settings`)
*   **OpenAI API Key**: Instructions that the `OPENAI_API_KEY` must be set in the `.env` file for AI features to work. The UI field is primarily for user reference.
*   **OpenAI Agent ID (Optional)**: For using custom OpenAI Assistants (if configured in flows).
*   **Default Output Language**: Select the default language for all AI-generated content (themes, summaries, main content).
*   **Danger Zone**:
    *   Clear All Content Items.
    *   Clear All Theme Suggestions.
    *   Clear All Summaries.
    *   Clear All Application Data (Content, Themes, Summaries).

## Styling
*   The application uses **Tailwind CSS** for utility-first styling.
*   **ShadCN UI** provides the base for unstyled, accessible components.
*   The theme colors (soft lavender, muted blue, light gray) are defined as HSL CSS variables in `src/app/globals.css` and are used by ShadCN components and Tailwind utilities.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details (if one exists).
```

This `README.md` provides a good overview of your ContentForge AI application, covering its features, setup, and how to use its main functionalities. You can expand on any section as needed.
