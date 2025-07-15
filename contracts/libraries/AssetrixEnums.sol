// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

library AssetrixEnums {
    enum PropertyType {
        ShortStay,
        LuxuryResidentialTowers
    }

    enum PropertyUse {
        Commercial,
        Hospitality,
        MixedUse
    }

    enum PropertyStatus {
        PreConstruction,
        UnderConstruction,
        Renovation
    }

    enum Duration {
        OneMonth,      // 0
        ThreeMonths,   // 1
        FiveMonths,    // 2
        SevenMonths,   // 3
        EightMonths,   // 4
        NineMonths,    // 5
        TenMonths,     // 6
        TwelveMonths   // 7
    }

    enum TransactionType {
        Investment,
        ROIPayout,
        FinalPayout,
        Refund,
        EmergencyRefund,
        EarlyExitFee,
        MilestoneRelease,
        PropertyCreation,
        PropertyUpdate
    }
}