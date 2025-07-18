var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import * as React from "react";
import { cn } from "@/lib/utils";
export function CommandGroup(_a) {
    var { heading, children, className } = _a, props = __rest(_a, ["heading", "children", "className"]);
    return (<div className={cn("mb-2", className)} {...props}>
      {heading && (<div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {heading}
        </div>)}
      <div className="space-y-1">{children}</div>
    </div>);
}
