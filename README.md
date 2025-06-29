# Personal Budget Tracker

A comprehensive personal budget tracking application built with React, Node.js, Express, and PostgreSQL. Features include transaction management, category organization, data visualization with Chart.js, and export functionality.

## Features

- **User Authentication**: Secure JWT-based authentication system
- **Transaction Management**: Add, edit, delete, and categorize income and expenses
- **Category Management**: Create and manage custom categories with colors and icons
- **Data Visualization**: Interactive charts showing spending trends and category breakdowns
- **Reports & Analytics**: Monthly summaries, trends analysis, and detailed reports
- **Export Functionality**: Export transactions as CSV or PDF
- **Responsive Design**: Modern, mobile-friendly interface built with Tailwind CSS

## Tech Stack

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Chart.js for data visualization
- Tailwind CSS for styling
- Axios for API communication
- Lucide React for icons

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- bcryptjs for password hashing
- Puppeteer for PDF generation
- CORS enabled for cross-origin requests

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PersonalBudget
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up the database**
   - Create a PostgreSQL database named `personal_budget`
   - Update the database configuration in `backend/config/database.js` if needed

4. **Create environment file**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Update the `.env` file with your database credentials and JWT secret.

5. **Initialize the database**
   ```bash
   psql -U postgres -d personal_budget -f backend/config/schema.sql
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```
This will start both the backend server (port 5000) and frontend development server (port 3000).

### Production Mode
```bash
# Build the frontend
npm run build

# Start the backend server
npm run server
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Transactions
- `GET /api/transactions` - Get transactions with filtering and pagination
- `POST /api/transactions` - Create a new transaction
- `PUT /api/transactions/:id` - Update a transaction
- `DELETE /api/transactions/:id` - Delete a transaction

### Categories
- `GET /api/categories` - Get categories
- `POST /api/categories` - Create a new category
- `PUT /api/categories/:id` - Update a category
- `DELETE /api/categories/:id` - Delete a category

### Reports
- `GET /api/reports/monthly-summary` - Get monthly summary
- `GET /api/reports/trends` - Get spending trends
- `GET /api/reports/export/csv` - Export transactions as CSV
- `GET /api/reports/export/pdf` - Export transactions as PDF

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=personal_budget
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Server Configuration
PORT=5000
NODE_ENV=development
```

## Default Categories

When a user registers, the following default categories are created:

### Income Categories
- Salary (Green)
- Freelance (Blue)
- Investment (Purple)

### Expense Categories
- Food & Dining (Orange)
- Transportation (Red)
- Entertainment (Pink)
- Shopping (Cyan)
- Bills & Utilities (Lime)
- Healthcare (Orange)
- Education (Indigo)

## Features Overview

### Dashboard
- Monthly summary with income, expenses, and net balance
- Daily spending trend chart
- Category breakdown pie chart
- Recent transactions list

### Transactions
- Add, edit, and delete transactions
- Filter by type, category, and date range
- Export to CSV or PDF
- Pagination support

### Categories
- Create custom income and expense categories
- Assign colors and icons to categories
- Edit and delete categories
- Visual category management

### Reports
- Monthly summaries with detailed breakdowns
- 6-month spending trends
- Category analysis
- Export functionality

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
