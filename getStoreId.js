



  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const axios = require("axios");

const API_KEY = "56749|O3wIwo4bboMvCNSX15RbB6SSIKGOWftd65OSiHQQ31cd1207";

axios.get("https://api.pushinpay.com/api/store", {
  headers: {
    Authorization: `Bearer ${API_KEY}`,
  },
})
  .then((res) => {
    console.log("\n===== STORE ID ENCONTRADO =====");
    console.log(res.data);
    console.log("================================\n");
  })
  .catch((err) => {
    console.error("Erro:", err.response?.data || err);
  });
