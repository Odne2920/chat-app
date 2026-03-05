STATUS: Working but there is a caching issue that needs to be fixed.
A reconnect bug has also been found.
--- ---

<a href="https://hrn-chat.github.io/" target="_blank">
  <p align="center">
    <img src="https://raw.githubusercontent.com/hrn-chat/hrn-chat.github.io/refs/heads/1.0.5/assets/README-content/hrn-chat-banner.jpg" width="900" alt="Banner"/>
  </p>
</a>

---
<p align="center">
  <a href="https://hrn-chat.github.io/docs/deploy.html">
    <img src="https://img.shields.io/badge/Deploy-Guide-111827?style=for-the-badge&logo=github&logoColor=white" />
  </a><br style="line-height:1.5em;">
  <img src="https://placehold.co/8000x10/6e6e6e/ffffff" />
</p>

> [!IMPORTANT]
> If you fork this project, consider giving it a star in the original repository!

## Features
- One-time email code login (expires in 10 minutes)
- Open public rooms & private password-protected rooms
- Direct messages (1-on-1 chats)
- Edit or delete messages (within 15 minutes)
- See who is online per room & total
- Copy messages with one tap
- Automatic date headers (Today • Yesterday • Monday • 15 Feb 2026)
- Fully readable offline
- End-to-end encryption (E2EE)

## Credits
- GH: **HyperRushNet / hrn-chat** – App UI, main logic, improved logic, new features

## License
- MIT License - You can use, modify, and share this software.  
- Original copyright notice must be included.

## Project Structure
```text
hrn-chat.github.io/
├── 404.html
├── LICENSE
├── README.md
├── index.html
├── service-worker.js
├── api/
│   ├── CORSproxy.js
│   └── mailAPI.js
├── assets/
│   ├── README-content/
│   │   └── hrn-chat-banner.jpg
│   ├── avatars/
│   │   ├── 1.webp
│   │   ├── 2.webp
│   │   ├── 3.webp
│   │   ├── 4.webp
│   │   └── 5.webp
│   ├── branding/
│   │   ├── app/
│   │   │   ├── icon-192x192-maskable.png
│   │   │   ├── icon-192x192-not-maskable.png
│   │   │   ├── icon-256x256-maskable.png
│   │   │   ├── icon-256x256-not-maskable.png
│   │   │   ├── icon-512x512-maskable.png
│   │   │   └── icon-512x512-not-maskable.png
│   │   └── favicon/
│   │       ├── favicon-black.png
│   │       └── favicon-white.png
│   ├── internet-test-file.txt
│   ├── logic.js
│   └── manifest.json
└── docs/
    └── deploy.html
```

