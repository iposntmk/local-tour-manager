# Local Tour Manager

A comprehensive tour management application built for travel agencies and tour operators to manage tours, expenses, destinations, and more.

## About

Local Tour Manager is a web-based application designed to streamline tour operations, including:

- **Tour Management**: Create, edit, and track tours with detailed information including tour codes, dates, clients, guides, and guest counts
- **Expense Tracking**: Manage tour expenses with customizable categories, automatic guest-based calculations, and flexible pricing
- **Destination Management**: Track destinations with pricing and maintain a reusable database of locations
- **Allowances & Meals**: Handle daily allowances and meal tracking for tour groups
- **Shopping Tracking**: Monitor shopping stops and commissions
- **Statistics Dashboard**: View comprehensive analytics and insights about your tours
- **Excel Export**: Export tour data to Excel with professional formatting for reporting and record-keeping
- **Multi-currency Support**: Handle pricing in VND (₫) with proper formatting

## Key Features

- **Comprehensive Tour Database**: Manage companies, nationalities, provinces, destinations, expense categories, and guides
- **Smart Data Grouping**: Automatically groups expenses by name with subtotals and merged calculations
- **Excel Integration**: Export individual tours or multiple tours to Excel with formatted sheets
- **Image Management**: Upload and manage tour images
- **Responsive Design**: Modern UI built with shadcn-ui and Tailwind CSS
- **Real-time Updates**: Powered by Supabase for real-time data synchronization
- **Type-safe**: Built with TypeScript for robust development

## Project info

**URL**: https://lovable.dev/projects/d542a080-a514-4b29-bb2b-af361d31ab36

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d542a080-a514-4b29-bb2b-af361d31ab36) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- **Vite**: Fast build tool and development server
- **TypeScript**: Type-safe JavaScript
- **React 18**: Modern React with hooks
- **React Router**: Client-side routing
- **shadcn-ui**: Beautiful and accessible UI components
- **Tailwind CSS**: Utility-first CSS framework
- **Supabase**: Backend as a Service (authentication, database, storage)
- **TanStack Query**: Data fetching and caching
- **ExcelJS**: Excel file generation and export
- **Recharts**: Charts and data visualization
- **Lucide React**: Icon library
- **Sonner**: Toast notifications
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d542a080-a514-4b29-bb2b-af361d31ab36) and click on Share -> Publish.

### Deploying to GitHub Pages

If you prefer to host the static build on GitHub Pages instead of Lovable, follow these steps:

1. **Set the base path:** add a `.env` (or repository secret in GitHub Actions) with the path that matches your repository name:

   ```
   VITE_APP_BASE_PATH=local-tour-manager
   ```

   If you are publishing from a project root on `https://<username>.github.io/`, leave this variable empty so the base defaults to `/`.

2. **Switch routing to hash mode:** the application now uses `HashRouter`, which works out of the box on static hosts such as GitHub Pages.

3. **Build the production bundle:**

   ```sh
   npm run build
   ```

   The static files will be generated in `dist/`.

4. **Publish to GitHub Pages:** serve the contents of `dist/` from the `gh-pages` branch (or the `/docs` folder) using the method you prefer:

   - Manually copy the build output to the branch that Pages is configured to serve.
   - Or automate with GitHub Actions. A minimal workflow could look like:

     ```yaml
     name: Deploy to GitHub Pages

     on:
       push:
         branches: [main]

     jobs:
       build-and-deploy:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
           - uses: actions/setup-node@v4
             with:
               node-version: 20
           - run: npm ci
           - run: npm run build
             env:
               VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
               VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
               VITE_APP_BASE_PATH: ${{ secrets.VITE_APP_BASE_PATH }}
           - uses: actions/upload-pages-artifact@v2
             with:
               path: dist
           - uses: actions/deploy-pages@v2
     ```

5. **Configure Supabase environment variables:** make sure the Supabase keys are provided as GitHub repository secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) so the build can access your backend.

After the workflow completes, your app will be available at `https://<username>.github.io/<repo-name>/`.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Application Structure

The application is organized into several main sections:

### Pages
- **Tours**: Main tour listing and management page with search and filtering
- **Tour Detail**: Comprehensive tour editing with tabs for:
  - General Info (tour code, dates, clients, guides)
  - Destinations (ticket prices and locations)
  - Expenses (itemized costs with guest-based calculations)
  - Meals (meal tracking)
  - Allowances (daily allowances by province)
  - Shopping (shopping stops and commissions)
  - Images (tour photo gallery)
- **Statistics**: Analytics dashboard with tour insights and metrics
- **Master Data Management**:
  - Companies
  - Nationalities
  - Provinces
  - Destinations
  - Detailed Expenses
  - Expense Categories
  - Guides
  - Shopping

### Data Model
Tours track comprehensive information including:
- Tour identification (code, dates)
- Client information (name, nationality, company)
- Guest counts (adults, children, total)
- Guide assignments
- Multiple expense types with automatic calculations
- Photo galleries
- Summary calculations (advance payments, collections, tips)

### Excel Export Features
- Single tour export with formatted sheets
- Multi-tour export with summary totals
- Automatic calculation of totals and subtotals
- Professional formatting with color-coded sections
- Merged duplicate expenses with summed guest counts
- Support for Vietnamese currency formatting

## Database

The application uses Supabase PostgreSQL database with tables for:
- `tours` - Main tour records
- `detailed_expenses` - Reusable expense items
- `expense_categories` - Expense categorization
- `destinations` - Destination database
- `provinces` - Province/location data
- `companies` - Travel company records
- `nationalities` - Nationality options
- `guides` - Tour guide database
- `shopping` - Shopping location database

## Environment Setup

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contributing

We welcome improvements and fixes. Start with `npm ci` and `npm run dev`. Before opening a PR, run `npm run lint` and `npm test`. See CONTRIBUTING.md for workflows and the PR template, and AGENTS.md for repository conventions (structure, scripts, linting, testing, and migrations).

## License

This project is private and proprietary.
