# MeshMint - Decentralized Proxy Network for AI Data Collection

> 🚧 **Work in Progress** - This project is currently under active development. Features may change.
<br/>
<p align="center">
  <img src="https://github.com/user-attachments/assets/b1e450e0-1269-41be-89a7-c15b5bb873ca" width="500"/><br/>
  <strong>Admin View</strong>
</p>
<br/>
<p align="center">
  <img src="https://github.com/user-attachments/assets/db3eafad-6390-4247-b913-080ef85f2187" width="500" style="margin-right: 20px;"/>
  <img src="https://github.com/user-attachments/assets/4d9662fc-ee7a-405d-b636-98315d690848" width="500"/>
</p>

<p align="center">
  <strong>User View</strong>
</p>

### TODO
- [x] Basic user authentication (sign up/sign in)
- [x] Admin task management interface
- [x] Basic proxy connection system
- [x] Task creation with priority levels
- [ ] Track actual bandwidth usage
- [ ] Calculate and show real earnings
- [ ] token incentives
- [ ] Add more task status updates
- [ ] Show task history for users

MeshMint is a Chrome extension that enables users to share their bandwidth and earn rewards by participating in a decentralized proxy network. This network helps AI builders collect data through web scraping while maintaining high success rates and avoiding detection.

## Problem Statement

idea has been picked from [link](build.superteam.fun) by Shek - [link](https://build.superteam.fun/ideas/decentralized-scraping-hub) 

AI builders constantly need new sources of data to train and improve their models. Web scraping is a crucial method for data collection, but it faces significant challenges:

- Websites implement sophisticated bot detection systems
- IP-based rate limiting and blocking
- Need for large-scale proxy networks
- High costs of maintaining proxy infrastructure

Companies like ScrapingHub (Zyte) and Bright Data invest heavily in maintaining proxy networks with hundreds of thousands of IP addresses to overcome these challenges.

## Solution

MeshMint leverages token incentives to build a decentralized proxy network with millions of individual IP addresses. The platform:

1. Allows users to share their idle bandwidth
2. Uses the shared bandwidth for web scraping tasks
3. Redistributes revenue generated from data collection as rewards to users as tokens
4. Provides a secure and transparent way to participate in the AI data economy

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/meshmint.git
cd meshmint
```

2. Install dependencies:
```bash
# Install backend dependencies
cd be
npm install

# Install frontend dependencies
cd ../fe
npm install
```

3. Set up environment variables:
```bash
# In be/.env
DATABASE_URL="postgresql://user:password@localhost:5432/meshmint"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
```

4. Run database migrations:
```bash
cd be
npx prisma migrate dev
```

5. Start the development servers:
```bash
# Start backend server
cd be
npm run dev

# Start frontend development
cd ../fe
npm run dev
```
6. Load the Chrome extension:
- Open Chrome and go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked" and select the `fe` directory

## Usage

1. Sign up or sign in to your MeshMint account
2. Click "Connect" to start sharing your bandwidth
3. Monitor your earnings and bandwidth usage in the dashboard
4. For administrators, use the task management interface to create and monitor scraping tasks
