# Telegraf Post Bot

A versatile and feature-rich Telegram bot designed for seamless content management. It offers watermarking, message signing, channel posting, user management with tiered access levels, and more. Perfect for automating content distribution and protecting your creative works.

## Features

* **Watermarking:**
    * Add custom watermarks to both videos and photos.
    * Protect your content and enhance its branding.
    * Support for text and image-based watermarks.
    
* **Message Signing:**
    * Append customizable signatures to messages.
    * Ideal for attribution, branding, or adding personalized notes.

* **Channel Posting:**
    * Easily post content to your Telegram channel.
    * Automate and schedule content distribution for consistent posting.

* **User Management:**
    * Full control over bot access with detailed user management tools.
    * Approve or deny users and track bot activity.

* **User Levels:**
    * Tailor the bot's functionality with different permission levels.
    * Grant or restrict access based on user roles (e.g., admin, contributor, viewer).

## Installation

To get started with Telegraf Post Bot, follow these steps:

1. Clone this repository to your local machine or server.
2. Run the installation script:

```bash
bash <(curl -s https://raw.githubusercontent.com/AliEslamdoust/post-bot/refs/heads/main/install.sh)

# Telegraf Post Bot (Example README)

## Configuration

To configure the bot, edit the `.env` file with your custom settings. Ensure you enter your Telegram bot token, channel numeric IDs, and owners numeric ID to your local `.env` file.

## Set Up Channel

To get your channel's numeric ID, first you should run your bot without the channel numeric ID. After running the bot use the `/getnumericid` command in the bot. Forward a message from your channel to the bot, and the bot will return the numeric ID.

### View Creator Information

To learn more about the bot's creator, simply type `/creator` in the bot.

### Editing the `.env` file

Make sure to configure the bot's settings correctly by editing the `.env` file. This includes adding your bot token and setting up channel IDs, among other configurations.

### Example Commands

* `/creator`: Display information about the bot creator.
* `/getnumericid`: Get the numeric ID of your Telegram channel (forward a message from the channel).
* `/start`: Start the bot and view available commands.
* `/help`: Get a list of available commands and instructions.

## Contributing

If you have any ideas, suggestions, or want to contribute to the project, feel free to fork the repository and submit a pull request. Contributions are welcome!

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.