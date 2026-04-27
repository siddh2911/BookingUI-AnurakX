# Nginx Cache Policy

`admin-cache-policy.locations.conf` is the nginx location policy for the admin SPA.

It intentionally serves `/`, `/login`, `/dashboard`, and `/index.html` with `Cache-Control: no-store` so OAuth redirects cannot reopen a stale React bundle. Hashed Vite assets under `/assets/` are cached for one year with `immutable`.

Deploy on the VPS:

```sh
sudo cp deploy/nginx/admin-cache-policy.locations.conf /etc/nginx/snippets/admin-cache-policy.locations.conf
```

Then include the snippet inside the active `server { ... }` block for `admin.karunavillas.com`:

```nginx
include /etc/nginx/snippets/admin-cache-policy.locations.conf;
```

Validate and reload:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

`admin.karunavillas.com.example.conf` is only a full-site example. Do not overwrite the live site config with it unless the `root` and SSL certificate paths match the VPS.
