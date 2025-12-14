{
  "targets": [
    {
      "target_name": "app_launcher",
      "sources": [
        "src/app_launcher_bindings.cpp",
        "src/app_launcher.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='win'", {
          "sources": [
            "src/app_launcher_windows.cpp"
          ],
          "libraries": [
            "-luser32",
            "-lpsapi",
            "-ladvapi32"
          ]
        }],
        ["OS=='mac'", {
          "sources": [
            "src/app_launcher_darwin.cpp"
          ],
          "libraries": [
            "-framework CoreFoundation",
            "-framework Cocoa"
          ]
        }],
        ["OS=='linux'", {
          "sources": [
            "src/app_launcher_linux.cpp"
          ],
          "libraries": [
            "-lX11"
          ]
        }]
      ]
    }
  ]
}