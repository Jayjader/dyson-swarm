# General notes
Things the player can look to optimize / things that can count towards the player's "score":
 - ticks to reach saturation with swarm (lower is better)
 - metal spent on _other_ things than satellites (lower is better)
 - total energy spent (lower is better)
 - manual interventions required (lower is better; can be negative, might outright disable score/cause player to lose, or can just be a sizeable bonus when completely avoided - maybe even a direct percentage of the rest of the player's score added on)


 Figure out what kind of playstyle[0] to balance the numbers around.
 
 0: average length of consecutive gameplay session, average time for "idle" playstyle i.e. "make some decisions then leave the game to run undisturbed for a variable amount of time (minutes to hours)", 


# Names
Dyson S.W.A.R.M. -> Satellites With Active Reflective Mass
Dyson S.W.A.R.M. -> Satellites With Additional Reflective Mass
Dyson S.W.A.R.M. -> Satellites Who Are Reflective Mass

DOTS -> Dyson swarm Operator Training Simulator
(can also be a pun on how the satellites are rendered as dots)

# Tutorial
Figure out triggers for the different tutorial parts instead of railroading the player into a certain linear completion of them.
That, or don't show actions that could take them off the tutorial path until it is completed (or a specific action cannot take them beyond the confines of the tutorial)

## New Game
no buildings, enough stored energy and refined metal to build:
 - 1 miner
 - 1 refiner
 - enough collectors to power them & retain a net positive energy flow?

maybe start with a small number of collectors (maybe even just 1) anyway to help avoid both early failure and allow the player to wait as long as they prefer before building one
(better player agency)

## Simulation Clock Control
### Controlling Clock Increment
#### Start Simulation Clock -> observe tick count starts increasing
#### Pause Simulation Clock -> observe tick count stops increasing
### Controlling Clock Speed
#### Adjust Simulation Clock Speed (during pause)
#### Adjust Simulation Clock Speed after resuming -> observe clock pauses "for you" while adjusting

## Fabricator
### Adding a New Single Build Order
#### Pause clock "let's pause the clock first so that we can think"
#### Switch Fabricator Build Order Queue into Edit mode
#### Enter Add Build Order mode
#### Add a Single <Solar Collector> Build Order to the Queue -> observe ui is now back in Edit mode
#### Save Edits
#### Resume clock -> observe build order is pushed out of queue, and is worked by fabricator
### Adding several New Single Build Orders in one editing session
#### Enter Edit mode -> observe clock pauses "for you" when entering mode
#### Enter Add Build Order mode -> observe "single" mode state indicator
#### Toggle from "single" mode to "multiple" mode
#### Add a Single <Solar Collector> Build Order to the Queue -> observe ui remains in Add Build Order Mode
#### Add two more Single <Solar Collector> Build Orders to the Queue
#### Save Edits -> observe clock resumes "for you" when exiting mode
### Removing a Single Build Order
#### Enter Edit mode
#### Add a Single <Satellite Factory> Build Order to the Queue -> observe we have nowhere near enough energy production to #run it efficiently, and no metal production at all anyway to accumulate enough resources to build it
#### Enter Remove Build Order mode
#### Remove the Single <Satellite Factory> Build Order from the Queue
### Adding a New Repeat






## Actor Control
When circuit breaker trips
Or
When enough preliminary tutorials and gameplay have occurred (maybe if we can determine that without toggling any workers the player's progression is stuck)







## Game Progression (factory and launcher)
Ideal moment to hint at feedback loop / exponential growth effect.
Encourage playing around.



## scratchpad
