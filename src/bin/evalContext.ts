import { JssBlock, JssBlockCaller, JssMediaQueryBlock, JssStyleBlock, JssStyleSheet } from "translator/lib/core";
import { Px, Em, Percent, Dimentions } from "translator/lib/dimentions/dimention";
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
        'Dimentions' : Dimentions,
        'RgbColor': RgbColor,
        'HexColor': HexColor,
    };
}
