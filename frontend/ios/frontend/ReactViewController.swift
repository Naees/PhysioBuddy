//
//  ReactViewController.swift
//  
//
//  Created by Sean Er on 5/8/25.
//

import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

class ReactViewController: UIViewController {
  var reactNativeFactory: RCTReactNativeFactory?
  var reactNativeFactoryDelegate: RCTReactNativeFactoryDelegate?

  override func viewDidLoad() {
    super.viewDidLoad()
    reactNativeFactoryDelegate = ReactNativeDelegate()
    reactNativeFactoryDelegate!.dependencyProvider = RCTAppDependencyProvider()
    reactNativeFactory = RCTReactNativeFactory(delegate: reactNativeFactoryDelegate!)
    view = reactNativeFactory!.rootViewFactory.view(withModuleName: "HelloWorld")

  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
    override func sourceURL(for bridge: RCTBridge) -> URL? {
      self.bundleURL()
    }

    override func bundleURL() -> URL? {
    #if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
    }


}