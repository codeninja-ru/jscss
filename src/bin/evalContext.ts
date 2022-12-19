import { JssAtRuleBlock, JssBlock, JssBlockCaller, JssMediaQueryBlock, JssStyleBlock, JssStyleSheet, JssSupportsBlock } from "translator/lib/core";
import { Px, Em, Percent, Units } from "translator/lib/units/unit";
import { HexColor, RgbColor } from "translator/lib/colors/color";

export function evalContext() {
    return {
        'JssStylesheet': JssStyleSheet,
        'JssStyleBlock': JssStyleBlock,
        'JssBlock' : JssBlock,
        'JssBlockCaller' : JssBlockCaller,
        'JssMediaQueryBlock': JssMediaQueryBlock,
        'JssSupportsBlock': JssSupportsBlock,
        'JssAtRuleBlock': JssAtRuleBlock,
        'Px' : Px,
        'Em' : Em,
        'Percent' : Percent,
        'Dimentions' : Units,
        'RgbColor': RgbColor,
        'HexColor': HexColor,
    };
}
