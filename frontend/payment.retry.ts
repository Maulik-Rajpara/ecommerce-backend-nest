// import { io } from "socket.io-client";

// const socket = io("http://localhost:3000");

// // user login ke baad
// socket.emit("join", userId);

// // retry event
// socket.on("payment_retry_ready", (data) => {
//   console.log("Retry ready:", data);

//   const options = {
//     key: "RAZORPAY_KEY",
//     order_id: data.razorpayOrderId,
//   };

//   const rzp = new window.Razorpay(options);
//   rzp.open();
// });