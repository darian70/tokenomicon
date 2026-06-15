// Central bootstrap that imports every registered game oracle so a single
// import of this module wires the whole registry.

import './rate-roulette-oracle'
import './token-prophet-oracle'
import './benchmark-brawl-oracle'
import './context-chicken-oracle'
import './spot-deepfake-oracle'
import './prompt-golf-oracle'

export {} // ensure this file is a module
