const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODM3MjY4NjgxOWU5ZTAwMDI2NWFiZWUiLCJpYXQiOjE3NDg0NDgyMDgsImV4cCI6MTc0ODUzNDYwOH0.RYEeestMpjfwqwfomtWlndCJonBVJwF7r_r8TbiMmmc", // Replace with a real JWT
  }
});

socket.on("connect", () => {
  console.log("✅ Connected to Socket.IO as:", socket.id);

  // Send a test message
  socket.emit("send_message", {
    receiverId: "68372686819e9e000265abee", // Replace with actual user ID
    text: "Hello from Socket.IO client!"
  }, (response) => {
    console.log("📤 Message response:", response);
  });
});

socket.on("receive_message", (msg) => {
  console.log("📥 New message received:", msg);
});

socket.on("user_online", ({ userId }) => {
  console.log("🟢 User online:", userId);
});

socket.on("user_offline", ({ userId }) => {
  console.log("🔴 User offline:", userId);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});

socket.on("connect_error", (err) => {
  console.error("⚠️ Connection Error:", err.message);
});
