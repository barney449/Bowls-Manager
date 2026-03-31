exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);

    if (email === "gary@example.com" && password === "password") {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, user: { name: "Gary Stubbs", email: "gary@example.com", role: "Admin", id: "player-gary" } })
      };
    }

    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Invalid credentials" })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" })
    };
  }
};
