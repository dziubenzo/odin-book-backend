# Express Template

Created: before starting the **Where's Wally - Backend** project (04/04/2024)

Last updated: after completing the **Messaging App** project (25/04/2024)

Rather for **REST APIs** (no templating included)

Uses **imports** instead of **requires**

Comes with testing tools: **SuperTest** and **Jest**

Comes with almost everything ready for deployment, except creating a **dotenv vault**, but that's something to be done right before deployment

Comes **without** any authentication: set it up based on the **Blog API** (JWT Strategy) or **Members Only** (Local Strategy) project

## How To Use

- Run `npm i`
- Run `npm outdated` to get outdated dependencies
- Run `npm update` to update them
- Create `.env` file with **MONGODB_URI** and **PORT** values
- Change `package.json` (name key and description)
- Change `package-lock.json` (name key in two places)
- Change `README.md`
- Change everything else as you see fit

### Tips

- Install **bcryptjs** as a production dependency, not as a dev dependency
