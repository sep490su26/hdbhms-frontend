/** @type {import('next').NextConfig} */
const remotePatterns = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
    pathname: "/**",
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "8080",
    pathname: "/api/v1/**",
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "8080",
    pathname: "/room-samples/**",
  },
  {
    protocol: "http",
    hostname: "10.0.2.2",
    port: "8080",
    pathname: "/api/v1/**",
  },
  {
    protocol: "http",
    hostname: "10.0.2.2",
    port: "8080",
    pathname: "/room-samples/**",
  },
];

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
if (configuredApiBaseUrl) {
  try {
    const apiUrl = new URL(configuredApiBaseUrl);
    remotePatterns.push({
      protocol: apiUrl.protocol.replace(":", ""),
      hostname: apiUrl.hostname,
      ...(apiUrl.port ? { port: apiUrl.port } : {}),
      pathname: "/api/v1/**",
    });
    remotePatterns.push({
      protocol: apiUrl.protocol.replace(":", ""),
      hostname: apiUrl.hostname,
      ...(apiUrl.port ? { port: apiUrl.port } : {}),
      pathname: "/room-samples/**",
    });
  } catch {
    // Keep the built-in local fallbacks if the env is malformed.
  }
}

const nextConfig = {
  /* config options here */
  allowedDevOrigins: ['10.0.2.2'],
  reactCompiler: true,
  images: {
    remotePatterns,
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
};

export default nextConfig;
