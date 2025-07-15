import React from "react";

const Payment = ({ onPrev }) => (
  <div>
    <h2>Payment</h2>
    <p>You reached the end!</p>
    <button onClick={onPrev}>Prev</button>
  </div>
);

export default Payment;
