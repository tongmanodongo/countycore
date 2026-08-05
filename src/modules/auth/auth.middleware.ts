POST /api/auth/login          # User login
POST /api/auth/register       # User registration
GET /api/transactions         # Retrieve transactions (GET with filters for counties)
POST /api/transactions        # Create a new transaction
GET /api/transactions/{id}    # Retrieve a specific transaction
PUT /api/transactions/{id}    # Update a transaction (if applicable)
GET /api/reports              # Generate reports based on transactions