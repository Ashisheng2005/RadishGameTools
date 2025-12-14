{
  "targets": [
    {
      "target_name": "app_launcher",
      "sources": [
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
          "libraries": [
            "-luser32",
            "-lpsapi"
          ]
        }]
      ]
    }, 
    {
      "target_name": "icon_thumbnail",
      "sources": [
        "src/icon_thumbnail.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES"
      },
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS", "UNICODE", "_UNICODE"
        ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "-lShell32",
            "-lOle32",
            "-lgdiplus",
            "-lShlwapi",
            "-lOleAut32"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/EHsc", "/utf-8"]  
            }
          }
        }]
      ]
      
    }
  ]
}