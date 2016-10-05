# Overwatch LFG Bot v0.3.0

A bot written in Node.js, using the [Eris](https://github.com/abalabahaha/eris) library.  
Entries are auto-deleted after 30min, or whatever you set `delete_interval` to be in the [config](./src/config.json) file.

## To-Do List
- Nothing right now

## Installation

`npm install`

Then, set the bot's token in the [auth](./src/secret.json) file, and the designated lfg channel in the [config](./src/config.json) file.  
The [data](./src/data.json) file does not need to be edited, it's handled by the bot.

## Usage

`!lfg <mode> <platform> <region> <Tier (If competitive)>`