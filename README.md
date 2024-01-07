# Filtered Note Opener
This plugin is a note opener with customizable filters.

## Filtering Notes
You can filter notes based on:
- path (include/exclude)
- note name (include/exclude)

(Regex functionality WIP)

## Choosing a note
This plugin has two methods (pickers) for picking a note.

### Recursive
Chose folders to go into them. Chose a note to open it.
(If a chosen folders only has one note, it will be chosen automatically)

### Flat
Chose from a flat list of notes. See all notes and the folder paths to them without having to chose folders. 

## Usage
The plugin has its own command to trigger the picker.
The command can be bound to a hotkey.

## Install
### Obsidian Community Plugin
- Search for this plugin in the Community Plugins settings
- Click `Install`

### Manual
- Clone this repo into `.Obsidian/plugins`
- Run `npm run dev` to start compilation in watch mode.
- Toggle this plugin on in the Community Plugin settings.
