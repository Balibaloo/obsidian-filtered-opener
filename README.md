
User defined filter sets to open notes

# You should use this plugin if
- You want to select and open notes from defined sets of notes
- You want to define sets by in/excluding notes by their
	- filename
	- pathname
	- tags (WIP)
- You want to use regex to match the above properties

# Introduction
This is an [Obsidian](https://obsidian.md) plugin to pick a notes and folder.
To pick a note, use the "Pick Note" command.

If more than one Note Filter Set is defined, you will be prompted to chose a note

## picker types
Picker types change how the options are presented when selecting.

### Flat picker
Flattens the list of notes.
Shows notes as "first_different_folder_name/note_name"

### Recursive Picker
Chose a folder and then between any subfolders (if required)

## filter sets
Multiple filter sets can be defined in the setting tab.

### regex
All inputs support regex matching.
Regex will be used to match properties if the setting string is valid regex.
This regex is used to determine if settings are regex: `/^\/(.*)\/([gimuy]*)$/`.


## parent file hoisting
If the currently active note has a neighbour in the filter set, the neighbour will be shown first.

## API
The API of this plugin was created to be used with the [Local Template Configuration](https://github.com/Balibaloo/obsidian-local-template-configuration) Plugin but can be used by any other plugin.

The API exposes functions to 
- get notes and folders using Filter Set names
- create setting elements to input and maintain Filter Sets
