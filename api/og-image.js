import React from "react";
import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

function PawIcon() {
  const color = "#FFF7ED";

  return React.createElement(
    "svg",
    {
      width: 320,
      height: 320,
      viewBox: "0 0 320 320",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
    },
    React.createElement("ellipse", {
      cx: "160",
      cy: "190",
      rx: "60",
      ry: "52",
      transform: "rotate(-8 160 190)",
      fill: color,
    }),
    React.createElement("ellipse", {
      cx: "104",
      cy: "116",
      rx: "24",
      ry: "34",
      transform: "rotate(-20 104 116)",
      fill: color,
    }),
    React.createElement("ellipse", {
      cx: "146",
      cy: "84",
      rx: "23",
      ry: "33",
      transform: "rotate(-6 146 84)",
      fill: color,
    }),
    React.createElement("ellipse", {
      cx: "191",
      cy: "88",
      rx: "23",
      ry: "33",
      transform: "rotate(10 191 88)",
      fill: color,
    }),
    React.createElement("ellipse", {
      cx: "236",
      cy: "122",
      rx: "24",
      ry: "34",
      transform: "rotate(22 236 122)",
      fill: color,
    }),
  );
}

function BrandImage() {
  return React.createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #172554 0%, #1D4ED8 52%, #0EA5E9 100%)",
        fontFamily: "sans-serif",
      },
    },
    React.createElement("div", {
      style: {
        position: "absolute",
        width: 540,
        height: 540,
        borderRadius: 9999,
        background: "radial-gradient(circle, rgba(253,230,138,0.28) 0%, rgba(253,230,138,0) 72%)",
        top: 10,
        left: 330,
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute",
        width: 220,
        height: 220,
        borderRadius: 9999,
        background: "rgba(255,255,255,0.08)",
        top: -20,
        right: 120,
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute",
        width: 180,
        height: 180,
        borderRadius: 9999,
        background: "rgba(255,255,255,0.06)",
        bottom: -30,
        left: 120,
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute",
        inset: 36,
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.22)",
      },
    }),
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      React.createElement(PawIcon),
      React.createElement(
        "div",
        {
          style: {
            marginTop: 28,
            fontSize: 82,
            fontWeight: 800,
            letterSpacing: 2,
            color: "#FFF7ED",
          },
        },
        "CLIMBDOG",
      ),
    ),
  );
}

export default async function handler() {
  return new ImageResponse(React.createElement(BrandImage), {
    width: 1200,
    height: 630,
  });
}
