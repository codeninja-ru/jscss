import { JssBlock, JssBlockCaller, JssMediaQueryBlock, JssStyleBlock, JssStyleSheet } from "translator/lib/core";
import { Px, Em, Percent, Units } from "translator/lib/units/unit";
import { HexColor, RgbColor } from "translator/lib/colors/color";

export function evalContext() {
    return {
        'JssStylesheet': JssStyleSheet,
        'JssStyleBlock': JssStyleBlock,
        'JssBlock' : JssBlock,
        'JssBlockCaller' : JssBlockCaller,
        'JssMediaQueryBlock': JssMediaQueryBlock,
        'Px' : Px,
        'Em' : Em,
        'Percent' : Percent,
        'Dimentions' : Units,
        'RgbColor': RgbColor,
        'HexColor': HexColor,
    };
}
