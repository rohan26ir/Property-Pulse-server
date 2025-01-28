# PropertyPulse - Server Side  

## Purpose  
The server side of PropertyPulse serves as the backend API for the Building Management System. It manages the database, user roles, JWT authentication, and secure API endpoints.  

---

## Key Features  

1. **JWT Authentication**  
   - Tokens generated during login and verified for private routes.  

2. **Role-Based Access Control**  
   - Roles: User(without role), Member, and Admin.  
   - Admin-exclusive actions like announcements and user management.  

3. **Apartment Management**  
   - Store and retrieve apartment data securely.  
   - Paginated API for apartment listing.  
   - Search functionality with rent range filter.  

4. **Agreement Management**  
   - Store agreement requests with pending status.  
   - Update status after admin approval or rejection.  

5. **Coupon Management**  
   - Add, view, and update coupon availability by the admin.  

6. **Payment Processing**  
   - Store payment history for members.  
   - Apply valid coupons to reduce rent dynamically.  

7. **Notifications**  
   - Send notices for overdue rent.  

8. **Secure Data Handling**  
   - Firebase keys and MongoDB credentials secured using environment variables.  
   - Axios interceptors for handling token-based API requests.  

---

## Tech Stack  

- **Node.js**: Runtime environment.  
- **Express.js**: Server framework.  
- **MongoDB**: Database for storing data.  
- **JWT**: Authentication and authorization.  
- **Dotenv**: Secure environment variables.  
- **Mongoose**: ORM for MongoDB.  
- **Cors**: Cross-Origin Resource Sharing.  

---

## Notable Commits  

- Implemented JWT authentication and private route protection.  
- Designed API endpoints for CRUD operations on apartments.  
- Added paginated and filtered apartment retrieval.  
- Integrated coupon management system.  
- Secured sensitive data with environment variables.  

---

## Deployment  
Deployed on Vercel.

---


## Repository Links  
- [Server Repository](https://github.com/Programming-Hero-Web-Course4/b10a12-server-side-rohan26ir.git)

- [Client Repository](https://github.com/Programming-Hero-Web-Course4/b10a12-client-side-rohan26ir.git)
