//! Honest stubs for unimplemented platforms.
//!
//! These are declared MODULES in gen_x_simulator.agi but their cognitive
//! environments have not yet been reconstructed. The platform chooser
//! shows them with a "Awaiting community implementation" badge.
//!
//! See CONTRIBUTING_PLATFORMS.md.

use super::Platform;
use crate::types::Lesson;

macro_rules! stub_platform {
    (
        $struct_name:ident,
        $name:literal,
        $display:literal,
        $year:literal,
        $lineage:literal,
        $prompt:literal,
        $boot:literal
    ) => {
        pub struct $struct_name;
        impl Platform for $struct_name {
            fn name(&self) -> &'static str { $name }
            fn display_name(&self) -> &'static str { $display }
            fn release_year(&self) -> u32 { $year }
            fn cultural_lineage(&self) -> &'static str { $lineage }
            fn is_implemented(&self) -> bool { false }
            fn shell_prompt(&self) -> &'static str { $prompt }
            fn boot_screen(&self) -> &'static str { $boot }
            fn lessons(&self) -> Vec<Lesson> { Vec::new() }
        }
    };
}

stub_platform!(
    AppleII,
    "AppleII",
    "Apple ][",
    1977,
    "Structured thinking: Pascal + LOGO + education. The school-AV-cart machine.",
    "]",
    "\nAPPLE ][\n\n]\n"
);

stub_platform!(
    IBMPc,
    "IBMPc",
    "IBM PC",
    1981,
    "Serious-business pragmatist. DOS, spreadsheets, beige metal.",
    "A>",
    "\nIBM Personal Computer DOS\nVersion 2.00 (C)Copyright IBM Corp 1981, 1983\n\nA>\n"
);

stub_platform!(
    Atari800,
    "Atari800",
    "Atari 800",
    1979,
    "Audiovisual hacker: ANTIC + POKEY + demoscene + arcade ports.",
    "READY",
    "\n  ATARI COMPUTER - MEMO PAD\n\nREADY\n"
);
