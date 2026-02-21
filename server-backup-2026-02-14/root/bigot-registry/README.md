# Bigot Registry

A WordPress-style searchable public registry with SEO-optimized profile pages.

## Features

- **Search by Name**: Full-text search with support for aliases
- **Filter by Location**: State and city filtering
- **Filter by Category**: Categorized entries
- **SEO Optimized**: Yoast-style SEO with:
  - Unique, slug-based URLs for each person
  - Open Graph meta tags
  - Twitter Card support
  - JSON-LD structured data (Schema.org)
  - XML Sitemap generation
  - Canonical URLs
- **Pagination**: Efficient browsing of large datasets
- **Responsive Design**: Mobile-first approach

## Tech Stack

- **Frontend**: React 18, React Router, React Helmet Async
- **Backend**: Node.js, Express
- **Database**: MySQL 8.0
- **Deployment**: Docker, Docker Compose, Nginx

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### Quick Start with Docker

```bash
cd bigot-registry
docker-compose up -d
```

The app will be available at:
- Frontend: http://localhost:5002
- API: http://localhost:5001

### Local Development

**Backend:**
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

**Frontend:**
```bash
cd client
npm install
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/people/search` | Search with filters |
| GET | `/api/people/slug/:slug` | Get person by SEO slug |
| GET | `/api/people/:id` | Get person by ID |
| POST | `/api/people` | Create new entry |
| POST | `/api/people/:id/incidents` | Add incident |
| GET | `/api/categories` | List all categories |
| GET | `/api/states` | List all states |
| GET | `/api/sitemap` | Generate sitemap data |

### Search Parameters

- `q` - Search query (name, aliases)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)
- `state` - Filter by state
- `city` - Filter by city
- `category` - Filter by category

## SEO Features

Each person page includes:
- Descriptive title tags
- Meta descriptions
- Open Graph tags for social sharing
- Twitter Card support
- Schema.org Person structured data
- Canonical URLs
- Breadcrumb navigation

## Database Schema

- **people**: Main registry entries
- **incidents**: Documented incidents per person
- **social_profiles**: Social media links
- **evidence**: Supporting media/documents
- **categories**: Predefined categories

## Deployment

See the main project's `DEPLOYMENT.md` for VPS deployment instructions.

## License

MIT
