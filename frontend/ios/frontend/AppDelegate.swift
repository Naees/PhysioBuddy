import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var bridge: RCTBridge?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let jsCodeLocation: URL

  #if DEBUG
      guard let jsLocation = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index") else {
          fatalError("Failed to get jsBundleURL")
      }
      jsCodeLocation = jsLocation
  #else
      guard let jsLocation = Bundle.main.url(forResource: "main", withExtension: "jsbundle") else {
          fatalError("Failed to load main.jsbundle")
      }
      jsCodeLocation = jsLocation
  #endif


    let rootView = RCTRootView(
      bundleURL: jsCodeLocation,
      moduleName: "frontend", // Make sure this matches `AppRegistry.registerComponent(...)` in JS
      initialProperties: nil,
      launchOptions: launchOptions
    )

    let rootViewController = UIViewController()
    rootViewController.view = rootView

    window = UIWindow(frame: UIScreen.main.bounds)
    window?.rootViewController = rootViewController
    window?.makeKeyAndVisible()

    return true
  }
}
