#!/bin/bash

# Check if node is installed
if ! command -v node &> /dev/null; then
   echo "Node.js could not be found. Installing Node.js..."
    # Install nvm (Node Version Manager)
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

    # Load nvm (important to do after installation)
    . "$HOME/.nvm/nvm.sh"

    # Load nvm bash completion (optional for tab completion)
    [ -s "$HOME/.nvm/bash_completion" ] && \. "$HOME/.nvm/bash_completion"

    # Install latest stable Node.js version
    nvm install --lts

    # Use the latest stable Node.js version
    nvm use --lts
fi


# Set the project's GitHub repository URL
REPO_URL="https://github.com/AliEslamdoust/post-bot.git"

# Set the installation directory
INSTALL_DIR="/root/post-bot"

# Check if git is installed
if ! command -v git &> /dev/null; then
 echo "git could not be found. Installing git..."
 apt-get update && apt-get install -y git
fi

# Create the installation directory if it doesn't exist
mkdir -p "$INSTALL_DIR"

# Clone the repository using git
if git clone "$REPO_URL" "$INSTALL_DIR"; then
 echo "GitHub project cloned successfully to $INSTALL_DIR"

 # Navigate to the project directory
 cd "$INSTALL_DIR"

 # Install dependencies (if any)
if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "No package.json found. Skipping dependency installation."
fi

 echo "Installation complete!"
else
 echo "Failed to clone GitHub project."
 exit 1
fi

exit 0

# Set the service file path
SERVICE_FILE="/etc/systemd/system/post-bot.service"

# Create a dedicated user for the bot
if ! id -u postbot &> /dev/null; then
 echo "Creating dedicated user 'postbot'..."
 adduser --system postbot
fi

# Change ownership of the project directory
echo "Changing ownership of $INSTALL_DIR to postbot:postbot..."
chown -R postbot:postbot "$INSTALL_DIR"

# Create the systemd service file
echo "Creating systemd service file $SERVICE_FILE..."
cat <<EOF | sudo tee "$SERVICE_FILE"
[Unit]
Description=Telegraf Post Bot
After=network.target

[Service]
Type=simple
User=postbot
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
echo "Reloading systemd..."
sudo systemctl daemon-reload

# Enable the service
echo "Enabling post-bot service..."
sudo systemctl enable post-bot.service

# Start the service
echo "Starting post-bot service..."
sudo systemctl start post-bot.service

# Check the service status
echo "Checking post-bot service status..."
sudo systemctl status post-bot.service

echo "Telegraf Post Bot installation complete!"